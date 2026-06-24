// DO NOT import anything here

declare module API {
  // The export route returns a .tar.gz file (binary), so it has no JSON response type.

  // Pre-flight manifest: how big the backup is + per-file sizes for client-side chunk planning.
  type BackupManifestResponse = {
    fileCount: number
    totalBytes: number
    refSizes: number[] // size of each storage file in order; used to compute chunk boundaries
  }

  // Result of importing one table from an uploaded backup
  type BackupImportTableResult = {
    table: string
    imported: number
    skipped?: number // rows dropped because a uuid column held an empty/invalid value
    error?: string
  }

  // Result of importing one storage bucket's files from an uploaded backup
  type BackupImportBucketResult = {
    bucket: string
    uploaded: number
    failed?: number // files that failed to re-upload
    error?: string
  }

  type BackupImportResponse =
    | {
        results: BackupImportTableResult[]
        buckets?: BackupImportBucketResult[]
      }
    | { error: string }
}
