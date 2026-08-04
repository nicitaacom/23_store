import { NextResponse } from "next/server"

import { requireAdmin } from "../requireAdmin"
import { selectAllAuthUsers } from "../selectAllAuthUsers"
import { BACKUP_TABLES, listFiles, relinkBackupStorageValue } from "../backupTables"
import { isMissingSchemaError } from "@/utils/personalizationSchema"
import supabaseAdmin from "@/libs/supabase/supabaseAdmin"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 60

const ROW_PAGE_SIZE = 500
const UPDATE_CONCURRENCY = 10

type TPendingRowUpdate = {
  row: Record<string, unknown>
  columns: Record<string, unknown>
  urlsUpdated: number
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
          let rowUrlsUpdated = 0

          for (const column of config.storageUrlColumns) {
            const relinked = relinkBackupStorageValue(row[column], availablePaths, currentSupabaseUrl)
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
      const relinked = relinkBackupStorageValue(authUser.user_metadata?.avatar_url, availablePaths, currentSupabaseUrl)
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
