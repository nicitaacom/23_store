import type { User } from "@supabase/supabase-js"

import type { TBackupTableConfig } from "./backupConfig"

export type TBackupSourceUser = {
  id: string
  email: string
  emailConfirmedAt: string | null
  username: string
  avatarUrl: string | null
  providers: string[] | null
}

export type TBackupAuthMapping = {
  sourceUserId: string
  targetUserId: string
  passwordResetRequired: boolean
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function isBackupUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_REGEX.test(value)
}

export function selectBackupSourceUsers(rows: Record<string, unknown>[]): TBackupSourceUser[] {
  return rows.map((row, rowIndex) => {
    if (!isBackupUuid(row.id)) throw new Error(`23_users.csv row ${rowIndex + 1}: id must be a UUID`)
    if (typeof row.email !== "string" || !row.email.trim()) {
      throw new Error(`23_users.csv row ${rowIndex + 1}: email is required for cross-project restore`)
    }
    if (typeof row.username !== "string" || !row.username.trim()) {
      throw new Error(`23_users.csv row ${rowIndex + 1}: username is required`)
    }
    if (row.providers !== null && row.providers !== undefined && !Array.isArray(row.providers)) {
      throw new Error(`23_users.csv row ${rowIndex + 1}: providers must be an array or null`)
    }

    return {
      id: row.id,
      email: row.email.trim().toLowerCase(),
      emailConfirmedAt: typeof row.email_confirmed_at === "string" && row.email_confirmed_at ? row.email_confirmed_at : null,
      username: row.username.trim(),
      avatarUrl: typeof row.avatar_url === "string" && row.avatar_url ? row.avatar_url : null,
      providers: (row.providers as string[] | null | undefined) ?? null,
    }
  })
}

export function selectReferencedAuthUserIds(
  tables: Array<{ config: TBackupTableConfig; rows: Record<string, unknown>[] }>,
): string[] {
  const referencedUserIds = new Set<string>()

  for (const table of tables) {
    for (const row of table.rows) {
      for (const column of table.config.requiredAuthUserIdColumns) {
        const columnValue = row[column]
        if (isBackupUuid(columnValue)) referencedUserIds.add(columnValue)
      }
    }
  }

  return Array.from(referencedUserIds)
}

export function remapAuthUserIds(
  config: TBackupTableConfig,
  rows: Record<string, unknown>[],
  mappings: TBackupAuthMapping[],
): Record<string, unknown>[] {
  const mappingBySourceId = new Map(mappings.map(mapping => [mapping.sourceUserId, mapping]))

  return rows.map(row => {
    const remappedRow = { ...row }
    for (const column of config.authUserIdColumns) {
      const sourceUserId = row[column]
      if (typeof sourceUserId !== "string") continue
      const mapping = mappingBySourceId.get(sourceUserId)
      if (mapping) remappedRow[column] = mapping.targetUserId
    }

    if (config.name === "23_users" && typeof row.id === "string") {
      const mapping = mappingBySourceId.get(row.id)
      if (mapping) remappedRow.password_reset_required = mapping.passwordResetRequired
    }

    return remappedRow
  })
}

function mergeStringArrays(first: unknown, second: unknown): string[] {
  const values = [...(Array.isArray(first) ? first : []), ...(Array.isArray(second) ? second : [])]
  return Array.from(new Set(values.filter((value): value is string => typeof value === "string" && Boolean(value))))
}

export function mergeBackupPublicUserRows(
  rows: Record<string, unknown>[],
  existingRows: Record<string, unknown>[],
): Record<string, unknown>[] {
  const existingRowById = new Map(existingRows.map(row => [row.id, row]))

  return rows.map(row => {
    const existingRow = existingRowById.get(row.id)
    if (!existingRow) return row

    return {
      ...row,
      roles: mergeStringArrays(existingRow.roles, row.roles),
      providers: mergeStringArrays(existingRow.providers, row.providers),
    }
  })
}

function selectAuthMetadataString(metadata: User["user_metadata"], keys: string[]): string | null {
  for (const key of keys) {
    const value = metadata?.[key]
    if (typeof value === "string" && value.trim()) return value.trim()
  }
  return null
}

function normalizeBackupProvider(provider: string): string {
  return provider === "email" ? "credentials" : provider
}

export function selectMissingBackupPublicUsers(
  publicUsers: Record<string, unknown>[],
  referencedUserIds: string[],
  authUsers: User[],
): Record<string, unknown>[] {
  const publicUserIds = new Set(publicUsers.flatMap(user => (isBackupUuid(user.id) ? [user.id] : [])))
  const authUserById = new Map(authUsers.map(user => [user.id, user]))
  const missingUserIds = referencedUserIds.filter(userId => !publicUserIds.has(userId))

  return missingUserIds.map(userId => {
    const authUser = authUserById.get(userId)
    if (!authUser?.email) {
      throw new Error(`Cannot export Auth user ${userId}: it has referenced data but no email-backed Auth account`)
    }

    const providers = Array.from(
      new Set(
        [
          ...(Array.isArray(authUser.app_metadata?.providers) ? authUser.app_metadata.providers : []),
          ...(typeof authUser.app_metadata?.provider === "string" ? [authUser.app_metadata.provider] : []),
          ...(authUser.identities ?? []).map(identity => identity.provider),
        ]
          .filter((provider): provider is string => typeof provider === "string" && Boolean(provider))
          .map(normalizeBackupProvider),
      ),
    )
    const username =
      selectAuthMetadataString(authUser.user_metadata, ["username", "user_name", "full_name", "name"]) ??
      authUser.email.split("@")[0]

    return {
      id: authUser.id,
      created_at: authUser.created_at,
      username,
      email: authUser.email.trim().toLowerCase(),
      avatar_url: selectAuthMetadataString(authUser.user_metadata, ["avatar_url", "picture"]),
      roles: ["USER"],
      email_confirmed_at: authUser.email_confirmed_at ?? null,
      providers,
      password_reset_required: false,
      ai_pricing_enabled: false,
    }
  })
}
