export function formatBackupBytes(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${bytes} B`
}

export function formatBackupSpeed(bytesPerMs: number): string {
  return `${formatBackupBytes(bytesPerMs * 1000)}/s`
}

export function formatBackupDuration(milliseconds: number): string {
  const seconds = Math.max(0, Math.floor(milliseconds / 1000))
  return [Math.floor(seconds / 3600), Math.floor(seconds / 60) % 60, seconds % 60]
    .map(value => String(value).padStart(2, "0")).join(":")
}

export function getBackupTransferTime(startedAt: number | null, finishedAt: number | null, now: number,
  bytesDone: number, bytesTotal: number, speedBytesPerMs: number | null) {
  const elapsed = startedAt === null ? 0 : Math.max(0, (finishedAt ?? now) - startedAt)
  const remaining = finishedAt !== null || bytesTotal <= bytesDone || speedBytesPerMs === null || speedBytesPerMs <= 0 || !Number.isFinite(speedBytesPerMs)
    ? null : Math.ceil((bytesTotal - bytesDone) / speedBytesPerMs / 1000) * 1000
  return { elapsed, remaining }
}
