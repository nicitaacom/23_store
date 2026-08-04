import { getPublicUrl, isBackupBucket, type TBackupBucket } from "./backupConfig"

const PUBLIC_STORAGE_PATH_PREFIX = "/storage/v1/object/public/"

export type TBackupStoragePath = { bucket: TBackupBucket; path: string }

export type TBackupStorageValueRelinkResult = {
  value: unknown
  urlsUpdated: number
  unresolvedReferences: number
  unresolvedPaths: string[]
}

export function selectBackupStoragePath(value: unknown, currentSupabaseUrl?: string): TBackupStoragePath | null {
  if (typeof value !== "string") return null

  try {
    const url = new URL(value)
    if (url.protocol !== "http:" && url.protocol !== "https:") return null
    const currentSupabaseHost = currentSupabaseUrl ? new URL(currentSupabaseUrl).host : null
    if (!url.hostname.endsWith(".supabase.co") && url.host !== currentSupabaseHost) return null

    const prefixIndex = url.pathname.indexOf(PUBLIC_STORAGE_PATH_PREFIX)
    if (prefixIndex === -1) return null

    const storagePath = decodeURIComponent(url.pathname.slice(prefixIndex + PUBLIC_STORAGE_PATH_PREFIX.length))
    const separatorIndex = storagePath.indexOf("/")
    if (separatorIndex <= 0) return null

    const bucket = storagePath.slice(0, separatorIndex)
    const path = storagePath.slice(separatorIndex + 1)
    return isBackupBucket(bucket) && path ? { bucket, path } : null
  } catch {
    return null
  }
}

export function relinkBackupStorageValue(
  value: unknown,
  availablePaths: ReadonlySet<string>,
  currentSupabaseUrl: string,
): TBackupStorageValueRelinkResult {
  let urlsUpdated = 0
  let unresolvedReferences = 0
  const unresolvedPaths = new Set<string>()

  const visit = (currentValue: unknown): unknown => {
    const storagePath = selectBackupStoragePath(currentValue, currentSupabaseUrl)
    if (storagePath) {
      const key = `${storagePath.bucket}/${storagePath.path}`
      if (!availablePaths.has(key)) {
        unresolvedReferences++
        unresolvedPaths.add(key)
        return currentValue
      }

      const nextUrl = getPublicUrl(storagePath.bucket, storagePath.path, currentSupabaseUrl)
      if (nextUrl !== currentValue) urlsUpdated++
      return nextUrl
    }

    if (Array.isArray(currentValue)) return currentValue.map(visit)
    if (currentValue && typeof currentValue === "object") {
      return Object.fromEntries(Object.entries(currentValue).map(([key, nestedValue]) => [key, visit(nestedValue)]))
    }
    return currentValue
  }

  return {
    value: visit(value),
    urlsUpdated,
    unresolvedReferences,
    unresolvedPaths: Array.from(unresolvedPaths),
  }
}
