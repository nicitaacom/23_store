import { gzipSync, gunzipSync } from "node:zlib"
import { extract, pack } from "tar-stream"

// FK-safe order for restore: parents before children.
// utm_stats is intentionally excluded — it is shared across projects 14/23/28/29.
export const BACKUP_TABLES = ["23_users", "23_users_cart", "23_products", "23_tickets", "23_messages"] as const

export type BackupTable = (typeof BACKUP_TABLES)[number]

// Storage buckets to back up — mirrors app/ts/types/TBuckets.ts. Table rows only hold image
// URLs/paths; the actual files live here, so a real backup must include these objects.
export const BACKUP_BUCKETS = ["23_public-images", "23_avatar-images"] as const

export type BackupBucket = (typeof BACKUP_BUCKETS)[number]

// One storage object: its bucket, path within the bucket, mime type, and raw bytes.
export type BackupFile = { bucket: string; path: string; contentType?: string; body: Buffer }

// Conflict columns used to upsert each table on import (matches each table's primary key)
export const BACKUP_CONFLICT_COLUMNS: Record<BackupTable, string> = {
  "23_users": "id",
  "23_users_cart": "id",
  "23_products": "price_id,owner_id,id",
  "23_tickets": "id",
  "23_messages": "id",
}

// UUID columns per table — values must be valid uuids or the upsert throws 22P02 (text vs uuid).
// tickets.owner_id and messages.sender_id are intentionally TEXT (anonymous) and excluded here.
export const BACKUP_UUID_COLUMNS: Record<BackupTable, readonly string[]> = {
  "23_users": ["id"],
  "23_users_cart": ["id"],
  "23_products": ["owner_id"],
  "23_tickets": [],
  "23_messages": ["id"],
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// Drop rows whose uuid column holds an empty/invalid value so a single bad row
// can't fail the whole table's upsert with a 22P02 type error. Returns kept rows + skipped count.
export function filterRowsByUuidColumns(table: BackupTable, rows: unknown[]) {
  const uuidColumns = BACKUP_UUID_COLUMNS[table]
  if (uuidColumns.length === 0) return { rows, skipped: 0 }

  const kept = rows.filter(row => {
    const record = row as Record<string, unknown>
    return uuidColumns.every(column => typeof record[column] === "string" && UUID_REGEX.test(record[column] as string))
  })
  return { rows: kept, skipped: rows.length - kept.length }
}

export type BackupSnapshot = Record<string, unknown[]>

// Tar entry prefix + helpers so storage files round-trip without clashing with <table>.json entries.
const STORAGE_PREFIX = "storage/"
const storageEntryName = (file: BackupFile) => `${STORAGE_PREFIX}${file.bucket}/${file.path}`
const parseStorageEntry = (name: string) => {
  const rest = name.slice(STORAGE_PREFIX.length)
  const slash = rest.indexOf("/")
  if (slash < 0) return null
  return { bucket: rest.slice(0, slash), path: rest.slice(slash + 1) }
}

// Build a gzipped tar (.tar.gz): one <table>.json per table + storage/<bucket>/<path> per file.
export function createBackupArchive(snapshot: BackupSnapshot, files: BackupFile[] = []): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const archive = pack()
    const chunks: Buffer[] = []

    archive.on("data", chunk => chunks.push(chunk as Buffer))
    archive.on("error", reject)
    archive.on("end", () => resolve(gzipSync(Buffer.concat(chunks))))

    for (const table of BACKUP_TABLES) {
      const rows = snapshot[table] ?? []
      archive.entry({ name: `${table}.json` }, JSON.stringify(rows, null, 2))
    }

    // Store each file's mime type alongside it so import can re-upload with the right contentType.
    const contentTypes: Record<string, string> = {}
    for (const file of files) {
      archive.entry({ name: storageEntryName(file) }, file.body)
      if (file.contentType) contentTypes[`${file.bucket}/${file.path}`] = file.contentType
    }
    archive.entry({ name: "storage-content-types.json" }, JSON.stringify(contentTypes, null, 2))

    archive.finalize()
  })
}

// Parse a .tar.gz buffer back into table rows + storage files.
export function parseBackupArchive(gzipped: Buffer): Promise<{ snapshot: BackupSnapshot; files: BackupFile[] }> {
  return new Promise((resolve, reject) => {
    const snapshot: BackupSnapshot = {}
    const files: BackupFile[] = []
    let contentTypes: Record<string, string> = {}
    const extractor = extract()

    extractor.on("entry", (header, stream, next) => {
      const name = header.name
      const fileChunks: Buffer[] = []

      stream.on("data", chunk => fileChunks.push(chunk as Buffer))
      stream.on("error", reject)
      stream.on("end", () => {
        const buffer = Buffer.concat(fileChunks)
        if (name === "storage-content-types.json") {
          try {
            contentTypes = JSON.parse(buffer.toString("utf-8"))
          } catch {
            contentTypes = {}
          }
        } else if (name.startsWith(STORAGE_PREFIX)) {
          const parsed = parseStorageEntry(name)
          if (parsed) files.push({ bucket: parsed.bucket, path: parsed.path, body: buffer })
        } else {
          const table = name.replace(/\.json$/, "")
          try {
            const data = JSON.parse(buffer.toString("utf-8"))
            snapshot[table] = Array.isArray(data) ? data : []
          } catch {
            snapshot[table] = []
          }
        }
        next()
      })

      stream.resume()
    })

    extractor.on("error", reject)
    extractor.on("finish", () => {
      // Attach the mime types parsed from storage-content-types.json (entry order is not guaranteed).
      for (const file of files) file.contentType = contentTypes[`${file.bucket}/${file.path}`]
      resolve({ snapshot, files })
    })

    try {
      extractor.end(gunzipSync(gzipped))
    } catch (error) {
      reject(error instanceof Error ? error : new Error(String(error)))
    }
  })
}

// List + download every object in a bucket (recursively). Returns the files for the archive.
export async function downloadBucketFiles(
  storage: { from: (bucket: string) => any },
  bucket: string,
): Promise<BackupFile[]> {
  const files: BackupFile[] = []

  for (const ref of await listBucketObjects(storage, bucket)) {
    const { data: blob, error } = await storage.from(bucket).download(ref.path)
    if (error || !blob) continue
    files.push({ bucket, path: ref.path, contentType: ref.contentType, body: Buffer.from(await blob.arrayBuffer()) })
  }
  return files
}

// A storage object's metadata only (no bytes) — cheap to list, used for estimating + chunking.
export type BackupFileRef = { bucket: string; path: string; contentType?: string; size: number }

// List every object in a bucket (recursively) WITHOUT downloading bytes. Fast; used by the manifest.
export async function listBucketObjects(
  storage: { from: (bucket: string) => any },
  bucket: string,
): Promise<BackupFileRef[]> {
  const refs: BackupFileRef[] = []

  async function walk(prefix: string): Promise<void> {
    const { data: entries, error } = await storage.from(bucket).list(prefix, { limit: 1000 })
    if (error || !entries) return

    for (const entry of entries as {
      name: string
      id: string | null
      metadata: { mimetype?: string; size?: number } | null
    }[]) {
      const fullPath = prefix ? `${prefix}/${entry.name}` : entry.name
      // A folder has no id; recurse into it. A file has an id; record it.
      if (entry.id === null) {
        await walk(fullPath)
        continue
      }
      refs.push({ bucket, path: fullPath, contentType: entry.metadata?.mimetype, size: entry.metadata?.size ?? 0 })
    }
  }

  await walk("")
  return refs
}

// Download a specific ordered subset of file refs (one export "half"). Skips any that fail.
// onProgress fires after each file (done = files attempted so far) so the route can stream live progress.
export async function downloadFilesByRef(
  storage: { from: (bucket: string) => any },
  refs: BackupFileRef[],
  onProgress?: (done: number, total: number) => void | Promise<void>,
): Promise<BackupFile[]> {
  const files: BackupFile[] = []
  for (let i = 0; i < refs.length; i++) {
    const ref = refs[i]
    const { data: blob, error } = await storage.from(ref.bucket).download(ref.path)
    if (!error && blob) {
      files.push({ bucket: ref.bucket, path: ref.path, contentType: ref.contentType, body: Buffer.from(await blob.arrayBuffer()) })
    }
    await onProgress?.(i + 1, refs.length)
  }
  return files
}

// Split refs into contiguous index ranges so each chunk stays under targetBytes.
// Returns array of [from, to] inclusive index pairs (may be a single chunk covering everything).
export function splitRefsIntoChunks(refs: BackupFileRef[], targetBytes: number): Array<[number, number]> {
  if (refs.length === 0) return []
  const chunks: Array<[number, number]> = []
  let chunkStart = 0
  let chunkBytes = 0
  for (let i = 0; i < refs.length; i++) {
    chunkBytes += refs[i].size
    const isLast = i === refs.length - 1
    if (chunkBytes >= targetBytes || isLast) {
      chunks.push([chunkStart, i])
      chunkStart = i + 1
      chunkBytes = 0
    }
  }
  return chunks
}
