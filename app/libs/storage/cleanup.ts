import { randomUUID, timingSafeEqual } from "node:crypto"

import { activeStorageProvider, fileChangesPaused } from "./config"
import { deleteStorageObject } from "./operations"
import { storageProvider } from "./providers"
import { storagePublicUrl } from "./references"
import { storageRedis } from "./state"
import { StorageRequestError } from "./authorization"
import supabaseAdmin from "@/libs/supabase/supabaseAdmin"
import type { TStorageObject, TStorageProviderName } from "@/ts/storage"

type TCleanupProgress = { providerIndex: number; cursor: string | null; pending: TStorageObject[]; deletedFromPage: string[]; deleted: number }
const BATCH_SIZE = 20
const GUEST_GRACE_MS = 60 * 60 * 1000
const STAGING_GRACE_MS = 24 * 60 * 60 * 1000

export function authorizeStorageCleanup(authorization: string | null): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret || !authorization?.startsWith("Bearer ")) return false
  const received = Buffer.from(authorization.slice(7))
  const expected = Buffer.from(secret)
  return received.length === expected.length && timingSafeEqual(received, expected)
}

export function oldEnoughForCleanup(object: TStorageObject, now: number, staging = false): boolean {
  const updatedAt = object.updatedAt ? Date.parse(object.updatedAt) : NaN
  return Number.isFinite(updatedAt) && now - updatedAt > (staging ? STAGING_GRACE_MS : GUEST_GRACE_MS)
}

export function adjustCleanupCursor(provider: TStorageProviderName, cursor: string | null, deletedPaths: string[]): string | null {
  if (provider !== "supabase" || !cursor) return cursor
  const progress: { folders: string[]; offset: number } = JSON.parse(Buffer.from(cursor, "base64url").toString("utf8"))
  const deletedInCurrentFolder = deletedPaths.filter(path => path.split("/").slice(0, -1).join("/") === progress.folders[0]).length
  progress.offset = Math.max(0, progress.offset - deletedInCurrentFolder)
  return Buffer.from(JSON.stringify(progress)).toString("base64url")
}

async function guestFileReferenced(object: TStorageObject): Promise<boolean> {
  const url = storagePublicUrl(object.provider, object.bucket, object.path)
  const { data: referenced, error } = await supabaseAdmin.rpc("23_storage_guest_file_referenced", {
    candidate_urls: [url, decodeURI(url)],
  })
  if (error || typeof referenced !== "boolean") throw new Error(error?.message ?? "Reference check failed")
  return referenced
}

export async function runStorageCleanup(staging = false, start = false) {
  if (process.env.STORAGE_CLEANUP_ENABLED !== "true" || fileChangesPaused()) return { paused: true, deleted: 0 }
  const redis = storageRedis()
  const stateKey = `storage:23:cleanup:${staging ? "staging" : "guests"}`
  const lockKey = `${stateKey}:running`
  const lease = randomUUID()
  if (!await redis.set(lockKey, lease, { nx: true, ex: 120 })) throw new StorageRequestError("Cleanup is already running", 409)
  try {
    let progress = await redis.get<TCleanupProgress>(stateKey)
    if (!progress && !start) return { idle: true, deleted: 0 }
    progress ??= { providerIndex: 0, cursor: null, pending: [], deletedFromPage: [], deleted: 0 }
    // Automatic cleanup never purges the inactive provider's retained rollback source files.
    const providers: TStorageProviderName[] = staging && process.env.R2_ACCOUNT_ID
      ? ["supabase", "r2"] : [activeStorageProvider()]
    let examined = 0
    const deadline = Date.now() + 20000
    while (progress.providerIndex < providers.length && examined < BATCH_SIZE && Date.now() < deadline) {
      if (fileChangesPaused()) return { paused: true, deleted: progress.deleted }
      const provider = storageProvider(providers[progress.providerIndex])
      if (progress.pending.length === 0) {
        const page = staging ? await provider.listStaging(progress.cursor)
          : await provider.list("23_support-guest-images", "", progress.cursor)
        progress.pending = page.objects
        progress.cursor = page.cursor
        progress.deletedFromPage = []
        // Persist the page before any deletions. Interrupted runs retry exact object identities.
        await redis.set(stateKey, progress)
        if (page.objects.length === 0 && page.cursor) { examined++; continue }
      }
      while (progress.pending.length && examined++ < BATCH_SIZE && Date.now() < deadline) {
        const object = progress.pending[0]
        if (oldEnoughForCleanup(object, Date.now(), staging)) {
          const latest = await provider.inspect(object.bucket, object.path, staging)
          if (!latest) progress.deletedFromPage.push(object.path)
          if (latest && oldEnoughForCleanup(latest, Date.now(), staging) &&
            (staging || !await guestFileReferenced(latest))) {
            // The provider's API removes bytes. Metadata rows are never deleted directly.
            if (staging) await provider.delete(object.bucket, object.path, true)
            else await deleteStorageObject(object)
            progress.deleted++
            progress.deletedFromPage.push(object.path)
          }
        }
        progress.pending.shift()
        await redis.set(stateKey, progress)
      }
      if (progress.pending.length === 0) {
        progress.cursor = adjustCleanupCursor(provider.name, progress.cursor, progress.deletedFromPage)
        progress.deletedFromPage = []
        if (!progress.cursor) progress.providerIndex++
        await redis.set(stateKey, progress)
      }
    }
    const complete = progress.providerIndex >= providers.length
    if (complete) {
      await redis.set(`${stateKey}:last-report`, { deleted: progress.deleted, completedAt: new Date().toISOString() })
      await redis.del(stateKey)
    }
    return { complete, deleted: progress.deleted, examined }
  } finally { await redis.eval("if redis.call('get', KEYS[1]) == ARGV[1] then return redis.call('del', KEYS[1]) end return 0", [lockKey], [lease]) }
}
