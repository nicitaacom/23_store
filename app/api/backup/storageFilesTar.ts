import type { TBackupFileRef } from "./backupConfig"
import { addTarEntry, finalizeTar } from "@/api/backup/tarClient"
import { isStorageBucket, isStoragePath } from "@/libs/storage/references"

export type TBackupStorageFile = Pick<TBackupFileRef, "bucket" | "path" | "contentType"> & { bytes: Uint8Array }

const MAX_COMPONENT_BYTES = 200
const MAX_EXPORT_PATH_BYTES = 240
const STORAGE_PREFIX = "storage/"
const SHORT_STORAGE_PREFIX = "storage-files/"

function isExtractablePath(path: string): boolean {
  return (
    Buffer.byteLength(path, "utf8") <= MAX_EXPORT_PATH_BYTES &&
    path
      .split("/")
      .every(
        component =>
          component.length > 0 &&
          Buffer.byteLength(component, "utf8") <= MAX_COMPONENT_BYTES &&
          !/[<>:"\\|?*\u0000-\u001f]/.test(component) &&
          !/[. ]$/.test(component) &&
          !/^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(component),
      )
  )
}

/** Short exported names are separate from Storage keys; the map restores the original keys. */
export function buildStorageTar(files: TBackupStorageFile[]): Buffer {
  const chunks: Buffer[] = []
  const contentTypes: Record<string, string> = Object.create(null)
  const storagePaths: Record<string, string> = Object.create(null)
  const storedPaths = new Set<string>()

  files.forEach((file, index) => {
    if (!isStorageBucket(file.bucket) || !isStoragePath(file.path)) throw new Error("Invalid backup storage key")
    const storagePath = `${file.bucket}/${file.path}`
    if (storedPaths.has(storagePath)) throw new Error(`Duplicate storage path in backup: ${storagePath}`)
    storedPaths.add(storagePath)

    const originalName = `${STORAGE_PREFIX}${storagePath}`
    const extension = /\.[a-z0-9]{1,16}$/i.exec(file.path)?.[0] ?? ""
    const exportedName = isExtractablePath(originalName)
      ? originalName
      : `${SHORT_STORAGE_PREFIX}file-${String(index + 1).padStart(6, "0")}${extension}`

    addTarEntry(chunks, exportedName, Buffer.from(file.bytes))
    contentTypes[storagePath] = file.contentType
    if (exportedName !== originalName) storagePaths[exportedName] = storagePath
  })

  addTarEntry(chunks, "storage-content-types.json", Buffer.from(JSON.stringify(contentTypes), "utf8"))
  if (Object.keys(storagePaths).length > 0) {
    addTarEntry(chunks, "storage-paths.json", Buffer.from(JSON.stringify(storagePaths), "utf8"))
  }
  return finalizeTar(chunks)
}

function readStringMap(entries: Map<string, Buffer>, name: string): Record<string, string> {
  const entry = entries.get(name)
  if (!entry) return {}
  const parsed: unknown = JSON.parse(entry.toString("utf8"))
  if (
    !parsed ||
    typeof parsed !== "object" ||
    Array.isArray(parsed) ||
    Object.values(parsed).some(value => typeof value !== "string")
  ) {
    throw new Error(`Invalid ${name}: expected a map of paths to strings`)
  }
  return parsed as Record<string, string>
}

/** Read both older backups with original paths and backups with shortened local names. */
export function readStorageTarEntries(entries: Map<string, Buffer>): TBackupStorageFile[] {
  const contentTypes = readStringMap(entries, "storage-content-types.json")
  const storagePaths = readStringMap(entries, "storage-paths.json")
  const files: TBackupStorageFile[] = []
  const storedPaths = new Set<string>()

  for (const [name, bytes] of entries) {
    if (!name.startsWith(STORAGE_PREFIX) && !name.startsWith(SHORT_STORAGE_PREFIX)) continue
    if (!isStoragePath(name)) throw new Error(`Unsafe archive path: ${name}`)
    const mappedPath = Object.hasOwn(storagePaths, name) ? storagePaths[name] : null
    if (mappedPath && !name.startsWith(SHORT_STORAGE_PREFIX)) throw new Error(`Unexpected path mapping for ${name}`)
    const storagePath = mappedPath ?? (name.startsWith(STORAGE_PREFIX) ? name.slice(STORAGE_PREFIX.length) : null)
    if (!storagePath) throw new Error(`Missing original Storage path for ${name} in storage-paths.json`)

    const slashIndex = storagePath.indexOf("/")
    if (slashIndex < 1 || slashIndex === storagePath.length - 1) throw new Error(`Invalid Storage path for ${name}`)
    if (!isStorageBucket(storagePath.slice(0, slashIndex)) || !isStoragePath(storagePath.slice(slashIndex + 1)))
      throw new Error(`Unsafe or unsupported storage key: ${storagePath}`)
    if (storedPaths.has(storagePath)) throw new Error(`Duplicate storage path in backup: ${storagePath}`)
    storedPaths.add(storagePath)

    files.push({
      bucket: storagePath.slice(0, slashIndex),
      path: storagePath.slice(slashIndex + 1),
      bytes: new Uint8Array(bytes),
      contentType: Object.hasOwn(contentTypes, storagePath) ? contentTypes[storagePath] : "application/octet-stream",
    })
  }
  for (const name of Object.keys(storagePaths)) {
    if (!entries.has(name) || !name.startsWith(SHORT_STORAGE_PREFIX)) throw new Error(`Unused or invalid storage mapping: ${name}`)
  }
  return files
}
