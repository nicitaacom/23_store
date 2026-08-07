import { NextResponse } from "next/server"
import type { User } from "@supabase/supabase-js"

import { isBackupUuid } from "../backupAuthRestore"
import { requireAdmin } from "../requireAdmin"
import { selectAllAuthUsers } from "../selectAllAuthUsers"
import { normalizeAuthEmail } from "@/utils/publicUserSync"
import supabaseAdmin from "@/libs/supabase/supabaseAdmin"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 60

const BACKUP_SOURCE_ID_KEY = "backup_source_user_id"
const BACKUP_PASSWORD_RESET_KEY = "backup_password_reset_required"

function hasBackupPasswordResetMarker(user: User, sourceUserId: string): boolean {
  return (
    user.app_metadata?.[BACKUP_SOURCE_ID_KEY] === sourceUserId &&
    user.app_metadata?.[BACKUP_PASSWORD_RESET_KEY] === true
  )
}

export async function POST(request: Request) {
  const adminError = await requireAdmin()
  if (adminError) return NextResponse.json({ error: adminError }, { status: adminError === "Unauthorized" ? 401 : 403 })

  const body = (await request.json().catch(() => null)) as API.BackupAuthPrepareRequest | null
  if (!body || !Array.isArray(body.users) || !Array.isArray(body.referencedUserIds)) {
    return NextResponse.json({ error: "users and referencedUserIds must be arrays" } satisfies API.BackupAuthPrepareResponse, {
      status: 400,
    })
  }

  try {
    const sourceUserById = new Map<string, API.BackupAuthSourceUser>()
    const sourceUserIdByEmail = new Map<string, string>()

    for (const sourceUser of body.users) {
      const email = normalizeAuthEmail(sourceUser.email)
      if (!isBackupUuid(sourceUser.id) || !email || typeof sourceUser.username !== "string") {
        throw new Error(`Invalid archived user ${sourceUser.id || "without id"}`)
      }

      const duplicateSourceUserId = sourceUserIdByEmail.get(email)
      if (duplicateSourceUserId && duplicateSourceUserId !== sourceUser.id) {
        throw new Error(`The archive contains multiple users with email ${email}; merge them in the source database before restoring`)
      }

      sourceUserById.set(sourceUser.id, { ...sourceUser, email })
      sourceUserIdByEmail.set(email, sourceUser.id)
    }

    const sourceUserIdsToPrepare = new Set([...body.referencedUserIds, ...sourceUserById.keys()])
    for (const sourceUserId of sourceUserIdsToPrepare) {
      if (!isBackupUuid(sourceUserId)) throw new Error(`Invalid referenced Auth user id: ${sourceUserId}`)
    }

    const selectAllAuthUsersResp = await selectAllAuthUsers()
    const destinationUserById = new Map(selectAllAuthUsersResp.map(user => [user.id, user]))
    const destinationUserByEmail = new Map(
      selectAllAuthUsersResp.flatMap(user => {
        const email = normalizeAuthEmail(user.email)
        return email ? [[email, user] as const] : []
      }),
    )

    const mappings: API.BackupAuthMapping[] = []
    let created = 0
    let reused = 0

    for (const sourceUserId of sourceUserIdsToPrepare) {
      const sourceUser = sourceUserById.get(sourceUserId)
      let destinationUser = destinationUserById.get(sourceUserId)

      if (!destinationUser && sourceUser) destinationUser = destinationUserByEmail.get(sourceUser.email)
      if (!destinationUser && !sourceUser) {
        throw new Error(`Auth user ${sourceUserId} is missing in the destination project and 23_users.csv has no profile for it`)
      }

      if (!destinationUser && sourceUser) {
        const passwordResetRequired = Boolean(sourceUser.providers?.includes("credentials"))
        const { data, error } = await supabaseAdmin.auth.admin.createUser({
          email: sourceUser.email,
          email_confirm: Boolean(sourceUser.emailConfirmedAt),
          user_metadata: {
            username: sourceUser.username,
            avatar_url: sourceUser.avatarUrl,
          },
          app_metadata: {
            [BACKUP_SOURCE_ID_KEY]: sourceUser.id,
            [BACKUP_PASSWORD_RESET_KEY]: passwordResetRequired,
          },
        })
        if (error) throw error

        destinationUser = data.user
        destinationUserById.set(destinationUser.id, destinationUser)
        destinationUserByEmail.set(sourceUser.email, destinationUser)
        created++
      } else {
        reused++
      }

      if (!destinationUser) throw new Error(`Could not prepare Auth user ${sourceUserId}`)

      mappings.push({
        sourceUserId,
        destinationUserId: destinationUser.id,
        passwordResetRequired: hasBackupPasswordResetMarker(destinationUser, sourceUserId),
      })
    }

    return NextResponse.json({
      mappings,
      created,
      reused,
      passwordResetRequired: mappings.filter(mapping => mapping.passwordResetRequired).length,
    } satisfies API.BackupAuthPrepareResponse)
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) } satisfies API.BackupAuthPrepareResponse,
      { status: 500 },
    )
  }
}
