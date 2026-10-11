import { listStorageObjects, storageProvider } from "./providers"
import { STORAGE_BUCKETS } from "./references"
import type { TStorageProviderName } from "@/ts/storage"

export async function listBackupStorageFiles(name: TStorageProviderName) {
  const provider = storageProvider(name)
  const files = []
  for (const bucket of STORAGE_BUCKETS) files.push(...await listStorageObjects(provider, bucket))
  return files
}
