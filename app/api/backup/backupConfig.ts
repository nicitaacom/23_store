// The ONLY project-specific file in the backup feature. Everything the routes and the SDK need
// that varies from one project to the next lives here: which tables/buckets are backed up, how
// each table's columns round-trip through CSV, and how to build a public URL for a stored file.
//
// 23_store is admin-only, all data: requireAdmin() (app/api/backup/requireAdmin.ts) is the whole
// access boundary, checked once per route. There is no per-row/per-file ownership to scope by.
import { Database } from "@/ts/types_db"

// Untyped on purpose: routes pass a client typed to this project's full generated Database schema
// (SupabaseClient<Database>). Threading that specific generic through every function here causes
// TypeScript's inference to recurse ("Type instantiation is excessively deep") once a query chains
// .from(table).select()... against it. A bare `any` is the actual fix — call sites still get full
// typing on their own supabaseAdmin variable; only the parameter type here is loosened.
type AnySupabaseClient = any

type AllTables = keyof Database["public"]["Tables"]

// Tables intentionally left out of the backup archive. Any table added to types_db.ts that is
// neither here nor in BACKUP_TABLE_NAMES fails the exhaustiveness check below at compile time.
// eslint-disable-next-line @typescript-eslint/no-unused-vars -- used only as a type below
const EXCLUDED_FROM_BACKUP = ["utm_stats"] as const satisfies readonly AllTables[]

// Table names only, in FK-safe restore order — kept separate from BACKUP_TABLES so `as const
// satisfies` gives each name its exact literal type, and .from(name) typechecks without a cast
// anywhere this list is iterated.
export const BACKUP_TABLE_NAMES = [
  "23_users",
  "23_users_cart",
  "23_categories",
  "23_category_views",
  "23_products",
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
  numericColumns: string[]
  arrayColumns: string[]
  jsonColumns: string[]
}

// Column classification derived from app/ts/types_db.ts (not from prose docs, which have drifted
// before — see plan-00-tracker.md's DEV_README inconsistencies audit).
export const BACKUP_TABLES: TBackupTableConfig[] = [
  { name: "23_users", onConflict: "id", numericColumns: [], arrayColumns: ["providers", "roles"], jsonColumns: [] },
  { name: "23_users_cart", onConflict: "id", numericColumns: [], arrayColumns: [], jsonColumns: ["cart_products"] },
  { name: "23_categories", onConflict: "id", numericColumns: [], arrayColumns: [], jsonColumns: [] },
  {
    name: "23_category_views",
    onConflict: "user_id,category_id",
    numericColumns: ["view_count"],
    arrayColumns: [],
    jsonColumns: [],
  },
  {
    name: "23_products",
    onConflict: "price_id,owner_id,id",
    numericColumns: ["on_stock", "price"],
    arrayColumns: ["img_url"],
    jsonColumns: ["translations", "variants"],
  },
  { name: "23_tickets", onConflict: "id", numericColumns: ["rate"], arrayColumns: [], jsonColumns: [] },
  { name: "23_messages", onConflict: "id", numericColumns: [], arrayColumns: ["images"], jsonColumns: [] },
]

export function getTableConfig(name: string): TBackupTableConfig | undefined {
  return BACKUP_TABLES.find(table => table.name === name)
}

// ── buckets ───────────────────────────────────────────────────────────────────
//
// Mirrors app/ts/types/TBuckets.ts. Table rows only hold image URLs/paths; the actual files live
// here, so a real backup must include these objects.
export const BACKUP_BUCKETS = ["23_public-images", "23_avatar-images"] as const
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
async function listBucketFiles(admin: AnySupabaseClient, bucket: string, prefix = ""): Promise<TBackupFileRef[]> {
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

export async function listFiles(admin: AnySupabaseClient): Promise<TBackupFileRef[]> {
  const files: TBackupFileRef[] = []
  for (const bucket of BACKUP_BUCKETS) {
    files.push(...(await listBucketFiles(admin, bucket)))
  }
  return files
}

// ── public URL ──────────────────────────────────────────────────────────────
//
// Builds the public CDN URL the browser downloads each stored file from during a files export.
export function getPublicUrl(bucket: string, path: string): string {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!supabaseUrl) throw new Error("NEXT_PUBLIC_SUPABASE_URL is not set — public file URLs require it")
  const base = supabaseUrl.endsWith("/") ? supabaseUrl.slice(0, -1) : supabaseUrl
  return `${base}/storage/v1/object/public/${bucket}/${path}`
}
