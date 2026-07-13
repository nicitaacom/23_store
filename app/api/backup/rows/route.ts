import { NextResponse } from "next/server"

import { requireAdmin } from "../requireAdmin"
import { BACKUP_TABLES, getTableConfig, filterRowsByUuidColumns } from "../backupTables"
import supabaseAdmin from "@/libs/supabase/supabaseAdmin"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 60

// GET /api/backup/rows
//
// Returns every backed-up table's rows as JSON — always small, never touches Storage bytes. The
// browser converts each table to CSV and packs them into one .tar.gz (see
// app/sdk/BackupSDK/BackupSDK.ts's exportTables). Admin-only: requireAdmin() is the whole access
// boundary, there is no per-row scoping in this schema.
export async function GET() {
  const adminError = await requireAdmin()
  if (adminError) return NextResponse.json({ error: adminError }, { status: adminError === "Unauthorized" ? 401 : 403 })

  const tables: Record<string, unknown[]> = {}

  for (const table of BACKUP_TABLES) {
    const { data, error } = await supabaseAdmin.from(table.name).select("*")
    if (error) {
      return NextResponse.json(
        { error: error.message, code: error.code, details: error.details, hint: error.hint } satisfies API.BackupRowsGetResponse,
        { status: 500 },
      )
    }
    tables[table.name] = data ?? []
  }

  return NextResponse.json({ tables } satisfies API.BackupRowsGetResponse)
}

type TRowsPostBody = { table?: string; rows?: Record<string, unknown>[] }

// POST /api/backup/rows  { table, rows }
//
// Upserts one table's rows (sent by the browser in ≤500-row batches from importTables). Column
// coercion (numeric/array/jsonb) already happened client-side during CSV parse. Rows with an
// empty/invalid uuid column are dropped (reported as skipped) so one bad row is never able to fail
// the whole batch with a 22P02 (text = uuid) error.
export async function POST(request: Request) {
  const { table, rows } = (await request.json().catch(() => ({}))) as TRowsPostBody

  const config = table ? getTableConfig(table) : undefined
  if (!config) {
    return NextResponse.json(
      { error: `table must be one of ${BACKUP_TABLES.map(item => item.name).join(", ")}` } satisfies API.BackupRowsPostResponse,
      { status: 400 },
    )
  }
  if (!Array.isArray(rows)) {
    return NextResponse.json({ error: "rows must be an array" } satisfies API.BackupRowsPostResponse, { status: 400 })
  }

  const adminError = await requireAdmin()
  if (adminError) return NextResponse.json({ error: adminError }, { status: adminError === "Unauthorized" ? 401 : 403 })

  const { rows: keptRows, skipped } = filterRowsByUuidColumns(config, rows)
  if (keptRows.length === 0) return NextResponse.json({ rows: 0, skipped } satisfies API.BackupRowsPostResponse)

  const { error } = await supabaseAdmin.from(config.name).upsert(keptRows as never, { onConflict: config.onConflict })
  if (error) {
    return NextResponse.json(
      { error: error.message, code: error.code, details: error.details, hint: error.hint } satisfies API.BackupRowsPostResponse,
      { status: 500 },
    )
  }
  return NextResponse.json({ rows: keptRows.length, skipped } satisfies API.BackupRowsPostResponse)
}
