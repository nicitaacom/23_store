import { NextResponse } from "next/server"

import { requireAdmin } from "../requireAdmin"
import { selectAllAuthUsers } from "../selectAllAuthUsers"
import {
  BACKUP_TABLES,
  listFiles,
  relinkBackupStorageValue,
  selectBackupPathsByFolder,
  selectRelinkedPathsByFolder,
  type TBackupStoragePathsByFolder,
} from "../backupTables"
import { isMissingSchemaError } from "@/utils/personalizationSchema"
import { slugifyEmail } from "@/utils/slugify"
import supabaseAdmin from "@/libs/supabase/supabaseAdmin"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 60

const ROW_PAGE_SIZE = 500
const UPDATE_CONCURRENCY = 10
const EMPTY_RELINKED_PATHS: ReadonlyMap<string, string> = new Map()

type TPendingRowUpdate = {
  row: Record<string, unknown>
  columns: Record<string, unknown>
  urlsUpdated: number
}

// Everything a single row needs to be relinked, read once per run: the files Storage holds now, the
// same files indexed by folder, and the id -> email list every folder name is built from.
type TRelinkContext = {
  availablePaths: ReadonlySet<string>
  pathsByFolder: TBackupStoragePathsByFolder
  emailByUserId: ReadonlyMap<string, string>
  currentSupabaseUrl: string
}

// 23_users.email is the one value a Storage folder name is keyed on, and a row that owns images
// reaches it through an id column, so the whole id -> email list is read up front.
async function selectEmailByUserId(): Promise<ReadonlyMap<string, string>> {
  const emailByUserId = new Map<string, string>()

  for (let offset = 0; ; offset += ROW_PAGE_SIZE) {
    // eslint-disable-next-line local-rules/use-rls-supabase-client -- requireAdmin authorizes reading owner emails to rebuild Storage folder names.
    const { data, error } = await supabaseAdmin.from("23_users").select("id,email").range(offset, offset + ROW_PAGE_SIZE - 1)
    if (error) throw error

    const selectedUsers = data ?? []
    for (const selectedUser of selectedUsers) {
      if (selectedUser.email) emailByUserId.set(selectedUser.id, selectedUser.email)
    }
    if (selectedUsers.length < ROW_PAGE_SIZE) return emailByUserId
  }
}

/**
 * The row's own columns say which folder its images sit in today, which is what makes a restored
 * row fixable at all: its exported URLs still name the old project's path (often the retired
 * 23_public-images bucket), and no string match will ever find them.
 *
 * Relinking the first URL column on its own says which of that row's URLs Storage no longer
 * answers to. Those pair, in order, with the files actually in the row's folder - 1st unresolved
 * URL to slug-1.jpg, 2nd to slug-2.jpg. The pairing is then applied to every URL column of the
 * row, so a variant URL still equals the img_url entry it points at.
 */
function selectRowRelinkedPaths(
  config: (typeof BACKUP_TABLES)[number],
  row: Record<string, unknown>,
  context: TRelinkContext,
): ReadonlyMap<string, string> {
  const expectedFolder = config.selectStorageFolder?.(row, context.emailByUserId)
  const orderingColumn = config.storageUrlColumns?.[0]
  if (!expectedFolder || !orderingColumn) return EMPTY_RELINKED_PATHS

  const { unresolvedPaths } = relinkBackupStorageValue(row[orderingColumn], context.availablePaths, context.currentSupabaseUrl)
  return selectRelinkedPathsByFolder(unresolvedPaths, expectedFolder, context.pathsByFolder)
}

async function updateTableRows(
  config: (typeof BACKUP_TABLES)[number],
  pendingUpdates: TPendingRowUpdate[],
): Promise<void> {
  const rowIdColumns = config.onConflict.split(",")

  for (let start = 0; start < pendingUpdates.length; start += UPDATE_CONCURRENCY) {
    await Promise.all(
      pendingUpdates.slice(start, start + UPDATE_CONCURRENCY).map(async pendingUpdate => {
        // eslint-disable-next-line local-rules/use-rls-supabase-client -- requireAdmin authorizes relinking restored backup rows.
        let updateQuery = supabaseAdmin.from(config.name).update(pendingUpdate.columns as never)
        for (const column of rowIdColumns) {
          const value = pendingUpdate.row[column]
          if (value === undefined || value === null) throw new Error(`${config.name}.${column} is required to relink Storage URLs`)
          updateQuery = updateQuery.eq(column as never, value as never)
        }
        const { error } = await updateQuery
        if (error) throw error
      }),
    )
  }
}

export async function POST() {
  const adminError = await requireAdmin()
  if (adminError) return NextResponse.json({ error: adminError }, { status: adminError === "Unauthorized" ? 401 : 403 })

  try {
    const currentSupabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    if (!currentSupabaseUrl) throw new Error("NEXT_PUBLIC_SUPABASE_URL is not set")

    const availablePaths = new Set((await listFiles(supabaseAdmin)).map(file => `${file.bucket}/${file.path}`))
    const context: TRelinkContext = {
      availablePaths,
      pathsByFolder: selectBackupPathsByFolder(availablePaths),
      emailByUserId: await selectEmailByUserId(),
      currentSupabaseUrl,
    }
    const tables: API.BackupStorageRelinkTableResult[] = []
    const allUnresolvedPaths = new Set<string>()
    let rowsUpdated = 0
    let urlsUpdated = 0
    let unresolvedReferences = 0

    for (const config of BACKUP_TABLES) {
      if (!config.storageUrlColumns?.length) continue

      const tableUnresolvedPaths = new Set<string>()
      let tableRowsUpdated = 0
      let tableUrlsUpdated = 0
      let tableUnresolvedReferences = 0
      let offset = 0

      for (;;) {
        // eslint-disable-next-line local-rules/use-rls-supabase-client -- requireAdmin authorizes scanning backup URL columns before relinking.
        const { data, error } = await supabaseAdmin.from(config.name).select("*").range(offset, offset + ROW_PAGE_SIZE - 1)
        if (error) {
          if (config.optional && isMissingSchemaError(error)) break
          throw error
        }

        const selectedRows = (data ?? []) as Record<string, unknown>[]
        const pendingUpdates: TPendingRowUpdate[] = []

        for (const row of selectedRows) {
          const columns: Record<string, unknown> = {}
          const relinkedPathByExportedPath = selectRowRelinkedPaths(config, row, context)
          let rowUrlsUpdated = 0

          for (const column of config.storageUrlColumns) {
            const relinked = relinkBackupStorageValue(row[column], availablePaths, currentSupabaseUrl, relinkedPathByExportedPath)
            tableUnresolvedReferences += relinked.unresolvedReferences
            relinked.unresolvedPaths.forEach(path => tableUnresolvedPaths.add(path))
            if (relinked.urlsUpdated === 0) continue

            columns[column] = relinked.value
            rowUrlsUpdated += relinked.urlsUpdated
          }

          if (rowUrlsUpdated > 0) pendingUpdates.push({ row, columns, urlsUpdated: rowUrlsUpdated })
        }

        await updateTableRows(config, pendingUpdates)
        tableRowsUpdated += pendingUpdates.length
        tableUrlsUpdated += pendingUpdates.reduce((total, update) => total + update.urlsUpdated, 0)

        if (selectedRows.length < ROW_PAGE_SIZE) break
        offset += ROW_PAGE_SIZE
      }

      tableUnresolvedPaths.forEach(path => allUnresolvedPaths.add(path))
      rowsUpdated += tableRowsUpdated
      urlsUpdated += tableUrlsUpdated
      unresolvedReferences += tableUnresolvedReferences
      tables.push({
        table: config.name,
        rowsUpdated: tableRowsUpdated,
        urlsUpdated: tableUrlsUpdated,
        unresolvedReferences: tableUnresolvedReferences,
        unresolvedPaths: tableUnresolvedPaths.size,
      })
    }

    const selectAllAuthUsersResp = await selectAllAuthUsers()
    let authUsersUpdated = 0
    let authUrlsUpdated = 0
    let authUnresolvedReferences = 0
    const authUnresolvedPaths = new Set<string>()

    for (const authUser of selectAllAuthUsersResp) {
      // Same folder rule as 23_users.avatar_url: one file per account under the slugified email, so
      // an avatar whose URL still names the old auth.users.id folder is found by the account itself.
      const avatarRelinkedPaths = authUser.email
        ? selectRelinkedPathsByFolder(
            relinkBackupStorageValue(authUser.user_metadata?.avatar_url, availablePaths, currentSupabaseUrl).unresolvedPaths,
            `23_avatar-images/${slugifyEmail(authUser.email)}`,
            context.pathsByFolder,
          )
        : EMPTY_RELINKED_PATHS
      const relinked = relinkBackupStorageValue(
        authUser.user_metadata?.avatar_url,
        availablePaths,
        currentSupabaseUrl,
        avatarRelinkedPaths,
      )
      authUnresolvedReferences += relinked.unresolvedReferences
      relinked.unresolvedPaths.forEach(path => authUnresolvedPaths.add(path))
      if (relinked.urlsUpdated === 0) continue

      const { error } = await supabaseAdmin.auth.admin.updateUserById(authUser.id, {
        user_metadata: { ...authUser.user_metadata, avatar_url: relinked.value },
      })
      if (error) throw error
      authUsersUpdated++
      authUrlsUpdated += relinked.urlsUpdated
    }

    authUnresolvedPaths.forEach(path => allUnresolvedPaths.add(path))
    unresolvedReferences += authUnresolvedReferences
    urlsUpdated += authUrlsUpdated
    if (selectAllAuthUsersResp.length > 0) {
      tables.push({
        table: "auth.users",
        rowsUpdated: authUsersUpdated,
        urlsUpdated: authUrlsUpdated,
        unresolvedReferences: authUnresolvedReferences,
        unresolvedPaths: authUnresolvedPaths.size,
      })
    }

    return NextResponse.json({
      rowsUpdated,
      urlsUpdated,
      authUsersUpdated,
      unresolvedReferences,
      unresolvedPaths: allUnresolvedPaths.size,
      tables,
    } satisfies API.BackupStorageRelinkResult)
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) } satisfies API.BackupStorageRelinkResponse,
      { status: 500 },
    )
  }
}
