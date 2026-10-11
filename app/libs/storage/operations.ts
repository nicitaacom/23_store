import { randomUUID } from "node:crypto"

import { fileChangesPaused } from "./config"
import { fileKey, storageRedis } from "./state"
import { isStorageBucket, isStoragePath } from "./references"
import { storageProvider } from "./providers"
import { StorageRequestError } from "./authorization"
import type { TStorageReference } from "@/ts/storage"

export function validateStorageReference(reference: TStorageReference) {
  if (!reference || !["supabase", "r2"].includes(reference.provider) || !isStorageBucket(reference.bucket) || !isStoragePath(reference.path))
    throw new StorageRequestError("Invalid storage reference")
}

export async function deleteStorageObject(reference: TStorageReference): Promise<void> {
  validateStorageReference(reference)
  if (fileChangesPaused()) throw new StorageRequestError("File changes are paused for storage synchronization", 503)
  const redis = storageRedis()
  const lockKey = fileKey({ reference })
  const lease = randomUUID()
  if (!await redis.set(lockKey, lease, { nx: true, ex: 120 })) throw new StorageRequestError("File has a pending operation", 409)
  try {
    await redis.lpush("storage:23:journal", JSON.stringify({ action: "delete", reference, status: "prepared", at: new Date().toISOString() }))
    await storageProvider(reference.provider).delete(reference.bucket, reference.path)
    await redis.lpush("storage:23:journal", JSON.stringify({ action: "delete", reference, status: "complete", at: new Date().toISOString() }))
  } finally { await redis.eval("if redis.call('get', KEYS[1]) == ARGV[1] then return redis.call('del', KEYS[1]) end return 0", [lockKey], [lease]) }
}
