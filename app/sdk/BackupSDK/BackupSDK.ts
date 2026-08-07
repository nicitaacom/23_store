import { BaseSDK } from "../BaseSDK"
import {
  BACKUP_TABLES,
  addTarEntry,
  finalizeTar,
  parseTar,
  gzipBufferClient,
  gunzipBufferClient,
  toCsv,
  parseCsv,
  getPublicUrl,
  selectBackupSourceUsers,
  selectReferencedAuthUserIds,
  remapAuthUserIds,
  type TBackupTableConfig,
  type TBackupFileRef,
} from "@/api/backup/backupTables"

// How often (ms) the speed tracker below re-samples throughput, and how much weight a new sample
// gets against the running average (exponential moving average, not a flat average-since-start) —
// a flat average would lag badly behind a real speed change partway through a large transfer.
const SPEED_SAMPLE_INTERVAL_MS = 200
const SPEED_SAMPLE_WEIGHT = 0.3

const ROW_BATCH_SIZE = 500
const URL_BATCH_SIZE = 100
const DOWNLOAD_CONCURRENCY = 5

export type TTablesImportResult = {
  accounts: { created: number; reused: number; passwordResetRequired: number }
  tables: { table: string; rows: number; skipped: number }[]
  relink: API.BackupStorageRelinkResult
}
export type TFilesImportResult = {
  buckets: { bucket: string; files: number; failed: number }[]
  relink: API.BackupStorageRelinkResult
}

// Progress shape shared by the files flow (export + import) — bytes, not just a file count, plus
// the measured connection speed once known.
export type TBackupFilesProgress = {
  bytesDone: number
  bytesTotal: number
  label: string
  speedBytesPerMs: number | null
}

/** True for a .tar.gz / .gz archive (by extension), false for a loose .csv file. */
function isArchiveFile(file: File): boolean {
  return file.name.endsWith(".tar.gz") || file.name.endsWith(".gz") || file.name.endsWith(".tgz")
}

/**
 * Collect `<table>.csv` text keyed by table name from one input file — either a .tar.gz archive
 * (decompressed + parsed in the browser) or a single loose .csv (whose table is read from its
 * filename). Archive bytes never reach a server function.
 */
async function readCsvEntries(file: File): Promise<Record<string, string>> {
  if (!isArchiveFile(file)) {
    const table = file.name.replace(/\.csv$/i, "")
    return { [table]: await file.text() }
  }

  let tarBytes: Uint8Array
  try {
    tarBytes = await gunzipBufferClient(new Uint8Array(await file.arrayBuffer()))
  } catch (error) {
    throw new Error(`${file.name} is not a valid .tar.gz archive: ${error instanceof Error ? error.message : String(error)}`)
  }

  const entries = parseTar(Buffer.from(tarBytes))
  const csvEntries: Record<string, string> = {}
  for (const [name, entryBuffer] of Array.from(entries)) {
    if (name.endsWith(".csv")) csvEntries[name.replace(/\.csv$/i, "")] = entryBuffer.toString("utf8")
  }
  return csvEntries
}

/**
 * CSV stores every cell as text. On export a text[] column comes back a JS array and a jsonb /
 * jsonb[] column comes back an object/array, both of which toCsv writes as JSON. Here we reverse
 * that per the table's config so each row matches the column's Postgres type before upsert:
 * numericColumns → number, arrayColumns/jsonColumns → parsed. Everything else stays a string
 * (PostgREST coerces timestamp/uuid/enum/bool from text). A null cell stays null.
 */
function coerceRowsForImport(config: TBackupTableConfig, rows: Record<string, string | null>[]): Record<string, unknown>[] {
  const parseJsonColumns = new Set([...config.arrayColumns, ...config.jsonColumns])
  const numericColumns = new Set(config.numericColumns)

  return rows.map((row, rowIndex) => {
    const coerced: Record<string, unknown> = { ...row }
    for (const [column, value] of Object.entries(row)) {
      if (value === null) continue
      if (numericColumns.has(column)) {
        coerced[column] = value === "" ? null : Number(value)
      } else if (parseJsonColumns.has(column)) {
        try {
          coerced[column] = JSON.parse(value)
        } catch (error) {
          throw new Error(
            `${config.name}.csv row ${rowIndex + 1}, column "${column}": not valid JSON — ${error instanceof Error ? error.message : String(error)}`,
          )
        }
      }
    }
    return coerced
  })
}

/**
 * Upload a file to a Supabase signed upload URL with real progress events, using the same
 * multipart shape as the Supabase SDK's uploadToSignedUrl (a cacheControl field + the body
 * appended under an empty-string key) — but via XHR so we get upload.onprogress. x-upsert: true
 * mirrors the SDK and lets a re-import overwrite an existing object.
 */
function uploadToSignedUrlWithProgress(signedUrl: string, body: Blob, onProgress: (loaded: number) => void): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open("PUT", signedUrl)
    xhr.setRequestHeader("x-upsert", "true")
    xhr.upload.onprogress = event => {
      if (event.lengthComputable) onProgress(event.loaded)
    }
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve()
      } else {
        let message = xhr.responseText || xhr.statusText
        try {
          const parsed = JSON.parse(xhr.responseText)
          if (parsed?.message) message = parsed.message
        } catch {
          // Not JSON — fall back to the raw text as-is.
        }
        reject(new Error(`Upload failed: ${message}`))
      }
    }
    xhr.onerror = () => reject(new Error("Upload failed: network error"))
    const formData = new FormData()
    formData.append("cacheControl", "3600")
    formData.append("", body)
    xhr.send(formData)
  })
}

/**
 * Tracks real transfer speed from actual progress deltas — not a synthetic probe against a
 * separate asset (a fixed favicon fetch measures that one tiny file's latency, not the transfer
 * actually in flight, and silently falls back to a made-up constant the moment that asset is
 * missing or too small to fill its measurement window). Call sample(bytesDone) every time progress
 * advances; it re-computes at most once per SPEED_SAMPLE_INTERVAL_MS and returns a smoothed
 * bytes/ms figure (or null before the first real sample exists).
 */
function createSpeedTracker() {
  let lastSampleTime = performance.now()
  let lastSampleBytes = 0
  let speedBytesPerMs: number | null = null

  return {
    sample(bytesDone: number): number | null {
      const now = performance.now()
      const elapsed = now - lastSampleTime
      if (elapsed < SPEED_SAMPLE_INTERVAL_MS) return speedBytesPerMs

      const instantBytesPerMs = (bytesDone - lastSampleBytes) / elapsed
      speedBytesPerMs =
        speedBytesPerMs === null
          ? instantBytesPerMs
          : speedBytesPerMs * (1 - SPEED_SAMPLE_WEIGHT) + instantBytesPerMs * SPEED_SAMPLE_WEIGHT

      lastSampleTime = now
      lastSampleBytes = bytesDone
      return speedBytesPerMs
    },
  }
}

export class BackupSDK extends BaseSDK {
  async relinkStorageUrls(): Promise<API.BackupStorageRelinkResult> {
    const response = await this.postJson<Record<string, never>, API.BackupStorageRelinkResponse>("/api/backup/relink-storage-urls", {})
    if ("error" in response) throw new Error(`Failed to relink Storage URLs: ${response.error}`)
    return response
  }

  /**
   * Export table rows only (no storage files) as one .tar.gz containing a .csv per table. Kept
   * separate from file export so a table-only backup never has to touch Storage or wait on file
   * downloads.
   */
  async exportTables(onProgress: (done: number, total: number) => void): Promise<{ fileName: string; archiveFile: Blob }> {
    const response = await this.getJson<API.BackupRowsGetResponse>("/api/backup/rows")
    if ("error" in response) throw new Error(response.error)

    const tarChunks: Buffer[] = []
    let done = 0
    onProgress(done, BACKUP_TABLES.length)

    for (const table of BACKUP_TABLES) {
      const csv = toCsv((response.tables[table.name] ?? []) as Record<string, unknown>[])
      addTarEntry(tarChunks, `${table.name}.csv`, Buffer.from(csv, "utf8"))
      done++
      onProgress(done, BACKUP_TABLES.length)
    }

    const tarBuffer = finalizeTar(tarChunks)
    const gzipped = await gzipBufferClient(new Uint8Array(tarBuffer))
    const date = new Date().toISOString().slice(0, 10)
    const fileName = `23_backup-tables-${date}.tar.gz`
    const archiveFile = new Blob([gzipped], { type: "application/gzip" })

    return { fileName, archiveFile }
  }

  /**
   * Import table rows from CSV files — either .tar.gz archives (from exportTables) or loose .csv
   * files. Rows are parsed in the browser and POSTed to /api/backup/rows in ≤500-row batches, in
   * FK-safe order (BACKUP_TABLES). The server upserts on each table's primary key and returns
   * real counts (plus how many rows it skipped for a bad uuid column).
   */
  async importTables(files: File[], onProgress: (done: number, total: number, label: string) => void): Promise<TTablesImportResult> {
    const csvByTable: Record<string, string> = {}
    for (const file of files) {
      const entries = await readCsvEntries(file)
      Object.assign(csvByTable, entries)
    }

    const tablesToImport = BACKUP_TABLES.filter(table => csvByTable[table.name] !== undefined)
    if (tablesToImport.length === 0) {
      const example = BACKUP_TABLES[0]?.name ?? "table"
      throw new Error(`No table CSV files found — expected files like ${example}.csv, either loose or inside a .tar.gz archive.`)
    }

    // Parse every supplied table before creating Auth users or writing any rows. A malformed later
    // CSV must not leave the target with an avoidable partial restore.
    const parsedTables = tablesToImport.map(table => {
      try {
        return { config: table, rows: coerceRowsForImport(table, parseCsv(csvByTable[table.name])) }
      } catch (error) {
        throw new Error(`Failed to parse ${table.name}.csv: ${error instanceof Error ? error.message : String(error)}`)
      }
    })

    const usersTable = parsedTables.find(table => table.config.name === "23_users")
    const sourceUsers = selectBackupSourceUsers(usersTable?.rows ?? [])
    const referencedUserIds = selectReferencedAuthUserIds(parsedTables)
    const shouldPrepareAccounts = sourceUsers.length > 0 || referencedUserIds.length > 0
    const totalSteps = tablesToImport.length + (shouldPrepareAccounts ? 1 : 0) + 1

    const result: Omit<TTablesImportResult, "relink"> = {
      accounts: { created: 0, reused: 0, passwordResetRequired: 0 },
      tables: [],
    }
    let done = 0
    onProgress(done, totalSteps, "Restoring tables…")

    let authMappings: API.BackupAuthMapping[] = []
    if (shouldPrepareAccounts) {
      onProgress(done, totalSteps, "Preparing user accounts…")
      const prepareAuthResp = await this.postJson<API.BackupAuthPrepareRequest, API.BackupAuthPrepareResponse>(
        "/api/backup/auth-users",
        { users: sourceUsers, referencedUserIds } satisfies API.BackupAuthPrepareRequest,
      )
      if ("error" in prepareAuthResp) throw new Error(`Failed to prepare user accounts: ${prepareAuthResp.error}`)

      authMappings = prepareAuthResp.mappings
      result.accounts = {
        created: prepareAuthResp.created,
        reused: prepareAuthResp.reused,
        passwordResetRequired: prepareAuthResp.passwordResetRequired,
      }
      done++
      onProgress(done, totalSteps, "User accounts prepared")
    }

    for (const table of parsedTables) {
      onProgress(done, totalSteps, `Restoring ${table.config.name}…`)
      const rows = remapAuthUserIds(table.config, table.rows, authMappings)

      let importedRows = 0
      let skippedRows = 0

      for (let start = 0; start < rows.length; start += ROW_BATCH_SIZE) {
        const batch = rows.slice(start, start + ROW_BATCH_SIZE)
        const postResp = await this.postJson<{ table: string; rows: Record<string, unknown>[] }, API.BackupRowsPostResponse>(
          "/api/backup/rows",
          { table: table.config.name, rows: batch },
        )
        if ("error" in postResp) throw new Error(`Failed to import ${table.config.name}: ${postResp.error}`)
        importedRows += postResp.rows
        skippedRows += postResp.skipped
      }

      result.tables.push({ table: table.config.name, rows: importedRows, skipped: skippedRows })
      done++
      onProgress(done, totalSteps, `Restored ${table.config.name}`)
    }

    onProgress(done, totalSteps, "Relinking image URLs…")
    const relink = await this.relinkStorageUrls()
    done++
    onProgress(done, totalSteps, "Image URLs relinked")

    return { ...result, relink }
  }

  /**
   * Export storage files only as one .tar.gz, entirely in the browser: fetch the file list from
   * the server, download each file directly from Supabase's public CDN, and pack them locally.
   * The app server never touches Storage bytes, so there is no 60s function timeout regardless of
   * how large the library is. Progress is byte-accurate (file sizes are known from the list), and
   * the connection speed shown is measured live from these downloads as they happen.
   */
  async exportFiles(onProgress: (progress: TBackupFilesProgress) => void): Promise<{ fileName: string; archiveFile: Blob }> {
    const response = await this.getJson<API.BackupFilesGetResponse>("/api/backup/files")
    if ("error" in response) throw new Error(response.error)

    const files = response.files
    const bytesTotal = files.reduce((sum, file) => sum + file.size, 0)
    let bytesDone = 0
    const speedTracker = createSpeedTracker()
    onProgress({ bytesDone, bytesTotal, label: "", speedBytesPerMs: null })

    const packed: Array<{ file: TBackupFileRef; downloadedBytes: Buffer | null }> = new Array(files.length)
    let nextIndex = 0

    const worker = async () => {
      while (nextIndex < files.length) {
        const index = nextIndex++
        const file = files[index]
        let downloadedBytes: Buffer | null = null
        try {
          const response = await fetch(getPublicUrl(file.bucket, file.path))
          if (response.ok) downloadedBytes = Buffer.from(await response.arrayBuffer())
        } catch {
          // Missing/failed file — skip it (downloadedBytes stays null) rather than aborting the whole export.
        }
        packed[index] = { file, downloadedBytes }
        bytesDone += file.size
        onProgress({ bytesDone, bytesTotal, label: `${file.bucket}/${file.path}`, speedBytesPerMs: speedTracker.sample(bytesDone) })
      }
    }

    await Promise.all(Array.from({ length: Math.min(DOWNLOAD_CONCURRENCY, files.length || 1) }, worker))

    const tarChunks: Buffer[] = []
    const contentTypes: Record<string, string> = {}
    for (const { file, downloadedBytes } of packed) {
      if (!downloadedBytes) continue
      addTarEntry(tarChunks, `storage/${file.bucket}/${file.path}`, downloadedBytes)
      contentTypes[`${file.bucket}/${file.path}`] = file.contentType
    }
    addTarEntry(tarChunks, "storage-content-types.json", Buffer.from(JSON.stringify(contentTypes), "utf8"))

    const tarBuffer = finalizeTar(tarChunks)
    const gzipped = await gzipBufferClient(new Uint8Array(tarBuffer))
    const date = new Date().toISOString().slice(0, 10)
    const fileName = `23_backup-files-${date}.tar.gz`
    const archiveFile = new Blob([gzipped], { type: "application/gzip" })

    return { fileName, archiveFile }
  }

  /**
   * Import storage files from a .tar.gz archive — entirely client-side. The browser decompresses
   * and parses the archive locally (no server ever sees the archive bytes), asks the server for a
   * signed upload URL per file, then PUTs each file's bytes straight to Supabase. Progress is
   * byte-accurate: every file's exact size is already known from the parsed archive, and
   * xhr.upload.onprogress gives real in-flight bytes for the file currently uploading. The
   * connection speed shown is measured live from these uploads as they happen.
   */
  async importFiles(file: File, onProgress: (progress: TBackupFilesProgress) => void): Promise<TFilesImportResult> {
    const speedTracker = createSpeedTracker()
    onProgress({ bytesDone: 0, bytesTotal: 0, label: "Reading archive…", speedBytesPerMs: null })

    let tarBytes: Uint8Array
    try {
      tarBytes = await gunzipBufferClient(new Uint8Array(await file.arrayBuffer()))
    } catch (error) {
      throw new Error(`${file.name} is not a valid .tar.gz archive: ${error instanceof Error ? error.message : String(error)}`)
    }

    const entries = parseTar(Buffer.from(tarBytes))

    const contentTypesEntry = entries.get("storage-content-types.json")
    const contentTypes: Record<string, string> = contentTypesEntry ? JSON.parse(contentTypesEntry.toString("utf8")) : {}

    const archiveFiles: { bucket: string; path: string; bytes: Uint8Array; contentType: string }[] = []
    for (const [name, entryBuffer] of Array.from(entries)) {
      if (!name.startsWith("storage/")) continue
      const withoutPrefix = name.slice("storage/".length)
      const slashIndex = withoutPrefix.indexOf("/")
      if (slashIndex === -1) continue
      const bucket = withoutPrefix.slice(0, slashIndex)
      const path = withoutPrefix.slice(slashIndex + 1)
      archiveFiles.push({
        bucket,
        path,
        bytes: new Uint8Array(entryBuffer),
        contentType: contentTypes[`${bucket}/${path}`] ?? "application/octet-stream",
      })
    }

    if (archiveFiles.length === 0) {
      throw new Error("No storage files found in the archive — expected storage/23_product-images/… or storage/23_avatar-images/… entries.")
    }

    const byPath = new Map(archiveFiles.map(archiveFile => [`${archiveFile.bucket}/${archiveFile.path}`, archiveFile]))
    const bucketStats: Record<string, { files: number; failed: number }> = {}
    const firstErrorByBucket: Record<string, string> = {}

    const bytesTotal = archiveFiles.reduce((sum, archiveFile) => sum + archiveFile.bytes.length, 0)
    let bytesUploadedSoFar = 0

    const bumpStat = (bucket: string, key: "files" | "failed") => {
      if (!bucketStats[bucket]) bucketStats[bucket] = { files: 0, failed: 0 }
      bucketStats[bucket][key]++
    }

    for (let start = 0; start < archiveFiles.length; start += URL_BATCH_SIZE) {
      const batch = archiveFiles.slice(start, start + URL_BATCH_SIZE)

      const postResp = await this.postJson<{ files: { bucket: string; path: string }[] }, API.BackupFilesPostResponse>("/api/backup/files", {
        files: batch.map(archiveFile => ({ bucket: archiveFile.bucket, path: archiveFile.path })),
      })
      if ("error" in postResp) throw new Error(`Failed to prepare file upload: ${postResp.error}`)

      for (const target of postResp.results) {
        const archiveFile = byPath.get(`${target.bucket}/${target.path}`)

        if ("skipped" in target || !archiveFile) {
          bumpStat(target.bucket, "failed")
          if (archiveFile) bytesUploadedSoFar += archiveFile.bytes.length
          continue
        }

        onProgress({
          bytesDone: bytesUploadedSoFar,
          bytesTotal,
          label: `${target.bucket}/${target.path}`,
          speedBytesPerMs: speedTracker.sample(bytesUploadedSoFar),
        })
        const uploadFileData = new Blob([archiveFile.bytes], { type: archiveFile.contentType })
        try {
          await uploadToSignedUrlWithProgress(target.signedUrl, uploadFileData, loaded =>
            onProgress({
              bytesDone: bytesUploadedSoFar + loaded,
              bytesTotal,
              label: `${target.bucket}/${target.path}`,
              speedBytesPerMs: speedTracker.sample(bytesUploadedSoFar + loaded),
            }),
          )
          bumpStat(target.bucket, "files")
        } catch (error) {
          bumpStat(target.bucket, "failed")
          if (!firstErrorByBucket[target.bucket]) firstErrorByBucket[target.bucket] = error instanceof Error ? error.message : String(error)
        }
        bytesUploadedSoFar += archiveFile.bytes.length
      }
    }

    const totalUploaded = Object.values(bucketStats).reduce((sum, stat) => sum + stat.files, 0)
    if (totalUploaded === 0) {
      const firstError = Object.values(firstErrorByBucket)[0]
      throw new Error(firstError ?? "No files were uploaded — every path was skipped.")
    }

    onProgress({ bytesDone: bytesTotal, bytesTotal, label: "Relinking image URLs…", speedBytesPerMs: speedTracker.sample(bytesTotal) })
    const relink = await this.relinkStorageUrls()
    onProgress({ bytesDone: bytesTotal, bytesTotal, label: "Done", speedBytesPerMs: speedTracker.sample(bytesTotal) })
    return { buckets: Object.entries(bucketStats).map(([bucket, stat]) => ({ bucket, ...stat })), relink }
  }
}

export const backupSDK = new BackupSDK()
