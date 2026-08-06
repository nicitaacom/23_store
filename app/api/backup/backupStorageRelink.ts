import { getPublicUrl, isRelinkSourceBucket } from "./backupConfig"

const PUBLIC_STORAGE_PATH_PREFIX = "/storage/v1/object/public/"

export type TBackupStoragePath = { bucket: string; path: string }

export type TBackupStorageValueRelinkResult = {
  value: unknown
  urlsUpdated: number
  unresolvedReferences: number
  unresolvedPaths: string[]
}

export type TBackupStoragePathsByFolder = ReadonlyMap<string, readonly string[]>

const EMPTY_RELINKED_PATHS: ReadonlyMap<string, string> = new Map()

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
    return isRelinkSourceBucket(bucket) && path ? { bucket, path } : null
  } catch {
    return null
  }
}

/**
 * Index every stored file by the folder it sits in - `bucket/` plus everything before the last "/".
 * The files of one product (or one account's avatar) are then a single lookup, in the order they
 * were numbered: `slug-2.jpg` before `slug-10.jpg`, which an alphabetical sort reverses.
 */
export function selectBackupPathsByFolder(availablePaths: Iterable<string>): TBackupStoragePathsByFolder {
  const pathsByFolder = new Map<string, string[]>()

  for (const availablePath of availablePaths) {
    const folder = availablePath.slice(0, availablePath.lastIndexOf("/"))
    const folderPaths = pathsByFolder.get(folder)
    if (folderPaths) folderPaths.push(availablePath)
    else pathsByFolder.set(folder, [availablePath])
  }

  pathsByFolder.forEach(folderPaths =>
    folderPaths.sort((path, otherPath) => path.localeCompare(otherPath, undefined, { numeric: true })),
  )
  return pathsByFolder
}

/**
 * A row restored from another project holds the path its images had THERE - the old auth.users.id
 * folder, and often the retired `23_public-images` bucket. Nothing in Storage answers to that path
 * any more, so the exported string alone leaves every one of those images unresolved.
 *
 * The row itself still says where its images belong today: the owner's email and the product id
 * build the folder (see backupConfig's selectStorageFolder). This pairs the files actually sitting
 * in that folder with the row's unresolved paths, in order - the 1st unresolved URL takes
 * `slug-1.jpg`, the 2nd takes `slug-2.jpg`. A row holding more unresolved URLs than the folder has
 * files leaves the extra ones unresolved, which is what the relink report counts.
 */
export function selectRelinkedPathsByFolder(
  unresolvedPaths: readonly string[],
  expectedFolder: string,
  pathsByFolder: TBackupStoragePathsByFolder,
): ReadonlyMap<string, string> {
  const folderPaths = pathsByFolder.get(expectedFolder) ?? []
  const relinkedPathByExportedPath = new Map<string, string>()

  unresolvedPaths.forEach((unresolvedPath, index) => {
    const folderPath = folderPaths[index]
    if (folderPath) relinkedPathByExportedPath.set(unresolvedPath, folderPath)
  })

  return relinkedPathByExportedPath
}

export function relinkBackupStorageValue(
  value: unknown,
  availablePaths: ReadonlySet<string>,
  currentSupabaseUrl: string,
  relinkedPathByExportedPath: ReadonlyMap<string, string> = EMPTY_RELINKED_PATHS,
): TBackupStorageValueRelinkResult {
  let urlsUpdated = 0
  let unresolvedReferences = 0
  const unresolvedPaths = new Set<string>()

  const visit = (currentValue: unknown): unknown => {
    const storagePath = selectBackupStoragePath(currentValue, currentSupabaseUrl)
    if (storagePath) {
      const key = `${storagePath.bucket}/${storagePath.path}`
      const relinkedPath = relinkedPathByExportedPath.get(key)
      const resolvedPath = availablePaths.has(key) ? key : relinkedPath && availablePaths.has(relinkedPath) ? relinkedPath : null
      if (!resolvedPath) {
        unresolvedReferences++
        unresolvedPaths.add(key)
        return currentValue
      }

      const separatorIndex = resolvedPath.indexOf("/")
      const nextUrl = getPublicUrl(resolvedPath.slice(0, separatorIndex), resolvedPath.slice(separatorIndex + 1), currentSupabaseUrl)
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
