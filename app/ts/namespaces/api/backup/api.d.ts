// DO NOT import anything here

declare namespace API {
  // GET /api/backup/rows — every backed-up table's rows, keyed by table name. Always small text;
  // the browser converts each table to CSV and packs a .tar.gz locally.
  type BackupRowsGetResponse = { tables: Record<string, unknown[]> } | { error: string; code?: string; details?: string; hint?: string }

  // POST /api/backup/rows — upserts one table's rows (sent in ≤500-row batches). skipped counts
  // rows dropped because a uuid column held an empty/invalid value.
  type BackupRowsPostResponse = { rows: number; skipped: number } | { error: string; code?: string; details?: string; hint?: string }

  type BackupAuthSourceUser = {
    id: string
    email: string
    emailConfirmedAt: string | null
    username: string
    avatarUrl: string | null
    providers: string[] | null
  }

  // POST /api/backup/auth-users — called automatically by table import before the first row
  // upsert. It creates/reuses destination Auth users and returns source-id -> destination-id mappings.
  type BackupAuthPrepareRequest = {
    users: BackupAuthSourceUser[]
    referencedUserIds: string[]
  }
  type BackupAuthMapping = {
    sourceUserId: string
    destinationUserId: string
    passwordResetRequired: boolean
  }
  type BackupAuthPrepareResponse =
    | {
        mappings: BackupAuthMapping[]
        created: number
        reused: number
        passwordResetRequired: number
      }
    | { error: string }

  // One storage file's location + size + mime type — no bytes. Returned by the files list so the
  // browser knows what to download (export) and how big the whole set is (byte progress).
  type BackupFileRef = { bucket: string; path: string; size: number; contentType: string }

  // GET /api/backup/files — every stored file's metadata (paths only, never bytes). The browser
  // downloads each file straight from Supabase's public CDN and packs a .tar.gz locally.
  type BackupFilesGetResponse = { files: BackupFileRef[] } | { error: string; code?: string; details?: string; hint?: string }

  // POST /api/backup/files { files: [{ bucket, path }] } — asks for a signed upload URL per file.
  // The browser has already decompressed the archive locally; bytes are PUT straight to Supabase
  // from there, never through this route.
  type BackupUploadDestination =
    | { bucket: string; path: string; signedUrl: string }
    | { bucket: string; path: string; skipped: true; reason: string }
  type BackupFilesPostResponse = { results: BackupUploadDestination[] } | { error: string }

  type BackupStorageRelinkTableResult = {
    table: string
    rowsUpdated: number
    urlsUpdated: number
    unresolvedReferences: number
    unresolvedPaths: number
  }
  type BackupStorageRelinkResult = {
    rowsUpdated: number
    urlsUpdated: number
    authUsersUpdated: number
    unresolvedReferences: number
    unresolvedPaths: number
    tables: BackupStorageRelinkTableResult[]
  }
  type BackupStorageRelinkResponse =
    | BackupStorageRelinkResult
    | { error: string; code?: string; details?: string; hint?: string }
}
