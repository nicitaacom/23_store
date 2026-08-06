// The ONLY project-specific file in the backup feature. Everything the routes and the SDK need
// that varies from one project to the next lives here: which tables/buckets are backed up, how
// each table's columns round-trip through CSV, and how to build a public URL for a stored file.
//
// 23_store is admin-only, all data: requireAdmin() (app/api/backup/requireAdmin.ts) is the whole
// access boundary, checked once per route. There is no per-row/per-file ownership to scope by.
import type { SupabaseClient } from "@supabase/supabase-js"

import { Database } from "@/ts/types_db"

// File backup only needs the Storage API. Limiting the parameter to that API avoids threading
// database query generics through the recursive bucket walk.
type TStorageClient = Pick<SupabaseClient<Database>, "storage">

type AllTables = keyof Database["public"]["Tables"]

// Tables intentionally left out of the backup archive. Any table added to types_db.ts that is
// neither here nor in BACKUP_TABLE_NAMES fails the exhaustiveness check below at compile time.
// eslint-disable-next-line @typescript-eslint/no-unused-vars -- used only as a type below
const EXCLUDED_FROM_BACKUP = ["utm_stats", "23_buying_flow_events"] as const satisfies readonly AllTables[]

// Table names only, in FK-safe restore order — kept separate from BACKUP_TABLES so `as const
// satisfies` gives each name its exact literal type, and .from(name) typechecks without a cast
// anywhere this list is iterated.
export const BACKUP_TABLE_NAMES = [
  "23_users",
  "23_users_cart",
  "23_categories",
  "23_category_views",
  "23_products",
  "23_ai_price_runs",
  "23_ai_price_proposals",
  "23_personalized_designs",
  "23_tickets",
  "23_messages",
] as const satisfies readonly Exclude<AllTables, (typeof EXCLUDED_FROM_BACKUP)[number]>[]

// Compile-time exhaustiveness check: fails if types_db.ts gains/loses a table that isn't
// reflected in BACKUP_TABLE_NAMES or EXCLUDED_FROM_BACKUP.
type MissingFromBackup = Exclude<AllTables, (typeof BACKUP_TABLE_NAMES)[number] | (typeof EXCLUDED_FROM_BACKUP)[number]>
// eslint-disable-next-line @typescript-eslint/no-unused-vars -- compile-time exhaustiveness assertion, value is never read
const _assertAllTablesCovered: MissingFromBackup extends never ? true : never = true

export type TBackupTableName = (typeof BACKUP_TABLE_NAMES)[number]

// CSV stores every cell as text. PostgREST coerces most column types (timestamp/uuid/enum/bool)
// from a string on upsert, but three kinds must be handled explicitly so they survive a
// round-trip, so each table declares them:
//   numericColumns — sent as a JS number, never the string "42"
//   arrayColumns   — Postgres text[] written/read as a JSON array
//   jsonColumns    — jsonb / jsonb[] written/read as JSON so structure is preserved
export type TBackupTableConfig = {
  name: TBackupTableName
  onConflict: string
  optional?: boolean
  numericColumns: string[]
  arrayColumns: string[]
  jsonColumns: string[]
  // Columns whose scalar/array/JSON values can contain public URLs for BACKUP_BUCKETS. The relink
  // route walks only these columns, so unrelated URLs and text never change during restore.
  storageUrlColumns?: string[]
  // NOT NULL text columns whose database default is an empty string. Archives exported before
  // quoted empty CSV fields were added represent both null and "" as an unquoted empty field.
  emptyStringDefaultColumns?: string[]
  // Columns whose Postgres type is uuid. A row with an empty/invalid value in one of these is
  // dropped before upsert instead of failing the whole batch with a 22P02 (text = uuid) error —
  // see filterRowsByUuidColumns below.
  uuidColumns: string[]
  // Columns which can contain an authenticated user's id. Cross-project imports replace source
  // auth ids in these columns with the target project's ids before any public-table upsert. Text
  // columns can also contain anonymous ids; only exact ids returned by the Auth preparation route
  // are replaced.
  authUserIdColumns: string[]
  // Subset backed by a real FK to auth.users. Missing profiles for these ids must be completed on
  // export/import; UUID-looking values in the other text columns can be historical/deleted users.
  requiredAuthUserIdColumns: string[]
}

// Column classification derived from app/ts/types_db.ts (not from prose docs, which have drifted
// before — see plan-00-tracker.md's DEV_README inconsistencies audit). uuidColumns mirrors the
// live-verified set from the previous backupTables.ts (confirmed against the DB, plan-02, 2026-07-05).
export const BACKUP_TABLES: TBackupTableConfig[] = [
  {
    name: "23_users",
    onConflict: "id",
    numericColumns: [],
    arrayColumns: ["providers", "roles"],
    jsonColumns: [],
    storageUrlColumns: ["avatar_url"],
    uuidColumns: ["id"],
    authUserIdColumns: ["id"],
    requiredAuthUserIdColumns: ["id"],
  },
  {
    name: "23_users_cart",
    onConflict: "id",
    numericColumns: [],
    arrayColumns: [],
    jsonColumns: ["cart_products"],
    uuidColumns: ["id"],
    authUserIdColumns: ["id"],
    requiredAuthUserIdColumns: ["id"],
  },
  {
    name: "23_categories",
    onConflict: "id",
    numericColumns: [],
    arrayColumns: [],
    jsonColumns: [],
    uuidColumns: ["id"],
    authUserIdColumns: [],
    requiredAuthUserIdColumns: [],
  },
  {
    name: "23_category_views",
    onConflict: "user_id,category_id",
    numericColumns: ["view_count"],
    arrayColumns: [],
    jsonColumns: [],
    uuidColumns: ["id", "category_id"],
    authUserIdColumns: ["user_id"],
    requiredAuthUserIdColumns: [],
  },
  {
    name: "23_products",
    onConflict: "price_id,owner_id,id",
    numericColumns: ["on_stock", "price", "ai_price_baseline"],
    arrayColumns: ["img_url"],
    jsonColumns: ["translations", "variants", "personalization"],
    storageUrlColumns: ["img_url", "variants", "personalization"],
    uuidColumns: ["owner_id"],
    authUserIdColumns: ["owner_id"],
    requiredAuthUserIdColumns: ["owner_id"],
  },
  {
    name: "23_ai_price_runs",
    onConflict: "id",
    optional: true,
    numericColumns: ["eligible_count", "proposal_count"],
    arrayColumns: [],
    jsonColumns: ["sources"],
    uuidColumns: ["id"],
    authUserIdColumns: [],
    requiredAuthUserIdColumns: [],
  },
  {
    name: "23_ai_price_proposals",
    onConflict: "id",
    optional: true,
    numericColumns: ["current_price", "baseline_price", "proposed_price"],
    arrayColumns: [],
    jsonColumns: ["proposed_variants"],
    storageUrlColumns: ["proposed_variants"],
    uuidColumns: ["id", "run_id", "owner_id"],
    authUserIdColumns: ["owner_id"],
    requiredAuthUserIdColumns: [],
  },
  {
    name: "23_personalized_designs",
    onConflict: "id",
    numericColumns: ["source_width_px", "source_height_px", "print_width_mm", "print_height_mm", "effective_dpi"],
    arrayColumns: [],
    jsonColumns: ["placement"],
    storageUrlColumns: ["source_url"],
    uuidColumns: ["id", "owner_id"],
    authUserIdColumns: ["user_id", "owner_id"],
    requiredAuthUserIdColumns: ["owner_id"],
  },
  {
    name: "23_tickets",
    onConflict: "id",
    numericColumns: ["rate"],
    arrayColumns: [],
    jsonColumns: [],
    storageUrlColumns: ["owner_avatar_url"],
    emptyStringDefaultColumns: ["last_message_body"],
    uuidColumns: [],
    authUserIdColumns: ["owner_id"],
    requiredAuthUserIdColumns: [],
  },
  {
    name: "23_messages",
    onConflict: "id",
    numericColumns: [],
    arrayColumns: ["images"],
    jsonColumns: [],
    storageUrlColumns: ["images", "sender_avatar_url"],
    emptyStringDefaultColumns: ["body"],
    uuidColumns: ["id"],
    authUserIdColumns: ["sender_id"],
    requiredAuthUserIdColumns: [],
  },
]

export function getTableConfig(name: string): TBackupTableConfig | undefined {
  return BACKUP_TABLES.find(table => table.name === name)
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// Drop rows whose uuid column holds an empty/invalid value so a single bad row does not fail the
// whole table's upsert with a 22P02 (text = uuid) error. Returns the kept rows + how many were skipped.
export function filterRowsByUuidColumns(config: TBackupTableConfig, rows: Record<string, unknown>[]) {
  if (config.uuidColumns.length === 0) return { rows, skipped: 0 }

  const kept = rows.filter(row => config.uuidColumns.every(column => typeof row[column] === "string" && UUID_REGEX.test(row[column] as string)))
  return { rows: kept, skipped: rows.length - kept.length }
}

export function applyBackupImportDefaults(config: TBackupTableConfig, rows: Record<string, unknown>[]) {
  if (!config.emptyStringDefaultColumns?.length) return rows

  return rows.map(row => {
    const restoredRow = { ...row }
    for (const column of config.emptyStringDefaultColumns ?? []) {
      if (restoredRow[column] === null) restoredRow[column] = ""
    }
    return restoredRow
  })
}

// ── buckets ───────────────────────────────────────────────────────────────────
//
// Mirrors app/ts/types/TBuckets.ts. Table rows only hold image URLs/paths; the actual files live
// here, so a real backup must include these objects.
export const BACKUP_BUCKETS = [
  "23_product-images",
  "23_ai-product-images",
  "23_avatar-images",
  "23_support-images",
  "23_support-guest-images",
  "23_product-personalization-images",
] as const
export type TBackupBucket = (typeof BACKUP_BUCKETS)[number]

export function isBackupBucket(value: string): value is TBackupBucket {
  return (BACKUP_BUCKETS as readonly string[]).includes(value)
}

export type TBackupFileRef = { bucket: string; path: string; size: number; contentType: string }

// ── file listing ──────────────────────────────────────────────────────────────
//
// Admin-only: there is no per-file owner column anywhere in this schema, so file ownership IS
// bucket membership (isBackupBucket, checked by the files route before issuing an upload URL).
// listFiles derives the export list by walking the buckets directly via Storage.
const LIST_PAGE_SIZE = 100

const CONTENT_TYPE_BY_EXTENSION: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
  svg: "image/svg+xml",
  avif: "image/avif",
}

function contentTypeForPath(path: string): string {
  const extension = path.split(".").pop()?.toLowerCase()
  return (extension && CONTENT_TYPE_BY_EXTENSION[extension]) || "application/octet-stream"
}

// A folder entry has no id; recurse into it. A file entry has an id; record it.
async function listBucketFiles(admin: TStorageClient, bucket: string, prefix = ""): Promise<TBackupFileRef[]> {
  const files: TBackupFileRef[] = []
  let offset = 0

  for (;;) {
    const { data: entries, error } = await admin.storage.from(bucket).list(prefix, { limit: LIST_PAGE_SIZE, offset })
    if (error) throw error
    if (!entries || entries.length === 0) break

    for (const entry of entries as { name: string; id: string | null; metadata: { mimetype?: string; size?: number } | null }[]) {
      const path = prefix ? `${prefix}/${entry.name}` : entry.name
      if (entry.id === null) {
        files.push(...(await listBucketFiles(admin, bucket, path)))
      } else {
        files.push({
          bucket,
          path,
          size: entry.metadata?.size ?? 0,
          contentType: entry.metadata?.mimetype ?? contentTypeForPath(path),
        })
      }
    }

    if (entries.length < LIST_PAGE_SIZE) break
    offset += LIST_PAGE_SIZE
  }

  return files
}

export async function listFiles(admin: TStorageClient): Promise<TBackupFileRef[]> {
  const files: TBackupFileRef[] = []
  for (const bucket of BACKUP_BUCKETS) {
    files.push(...(await listBucketFiles(admin, bucket)))
  }
  return files
}

// ── public URL ──────────────────────────────────────────────────────────────
//
// Builds the public CDN URL the browser downloads each stored file from during a files export.
export function getPublicUrl(bucket: string, path: string, suppliedSupabaseUrl?: string): string {
  const supabaseUrl = suppliedSupabaseUrl ?? process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!supabaseUrl) throw new Error("NEXT_PUBLIC_SUPABASE_URL is not set — public file URLs require it")
  const base = supabaseUrl.endsWith("/") ? supabaseUrl.slice(0, -1) : supabaseUrl
  return `${base}/storage/v1/object/public/${bucket}/${path}`
}
