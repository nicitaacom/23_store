export function formatBackupBytes(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${bytes} B`
}

export function formatBackupSpeed(bytesPerMs: number): string {
  return `${formatBackupBytes(bytesPerMs * 1000)}/s`
}
