import { Redis } from "@upstash/redis"
import { Ratelimit } from "@upstash/ratelimit"

import { RATE_LIMITS } from "@/sdk/RateLimitSDK/consts/RATE_LIMITS"
import type { TStorageUploadSession } from "@/ts/storage"

let client: Redis | null = null
export function storageRedis(): Redis {
  if (!client) client = new Redis({ url: process.env.UPSTASH_REDIS_REST_URL, token: process.env.UPSTASH_REDIS_REST_TOKEN })
  return client
}
export function uploadKey(uploadId: string) { return `storage:23:upload:${uploadId}` }
export function fileKey(session: Pick<TStorageUploadSession, "reference">) {
  const { provider, bucket, path } = session.reference
  return `storage:23:lock:${provider}:${bucket}/${path}`
}
export async function limitStorageUploads(actor: string, ip: string, guest: boolean): Promise<boolean> {
  const definition = guest ? RATE_LIMITS.newMessage : RATE_LIMITS.storageUpload
  const limiter = new Ratelimit({ redis: storageRedis(), limiter: Ratelimit.fixedWindow(definition.maxAllowed, `${definition.windowSec} s`), analytics: false })
  const actorResponse = await limiter.limit(`storage:23:rate:${actor}`)
  const ipResponse = await limiter.limit(`storage:23:rate:ip:${ip}`)
  return actorResponse.success && ipResponse.success
}
export async function releaseFileLock(session: TStorageUploadSession, uploadId: string): Promise<void> {
  await storageRedis().eval("if redis.call('get', KEYS[1]) == ARGV[1] then return redis.call('del', KEYS[1]) end return 0", [fileKey(session)], [uploadId])
}
