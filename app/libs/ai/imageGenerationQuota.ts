import { Redis } from "@upstash/redis"

import { RATE_LIMITS } from "@/sdk/RateLimitSDK/consts/RATE_LIMITS"

export const AI_IMAGE_DAILY_LIMIT = RATE_LIMITS.aiGenerateImage.maxAllowed
export const AI_IMAGE_PURCHASE_CYCLE_LIMIT = 50

const redis = new Redis({ url: process.env.UPSTASH_REDIS_REST_URL, token: process.env.UPSTASH_REDIS_REST_TOKEN })
const PROCESSED_PURCHASES_KEY = "ai:image:processed-purchases"

export type TAIImageQuotaReservation = {
  allowed: boolean
  count: number
  epoch: number
}

function usageKey(userId: string) {
  return `ai:image:usage:${userId}`
}

function dailyUsageKey(userId: string, now = Date.now()) {
  const windowMs = RATE_LIMITS.aiGenerateImage.windowSec * 1000
  const bucket = Math.floor(now / windowMs)
  return `${RATE_LIMITS.aiGenerateImage.key(userId)}:${bucket}`
}

/** Reserve one attempt in the UTC-day bucket without counting requests denied at the limit. */
export async function reserveAIImageDailyGeneration(userId: string) {
  const now = Date.now()
  const windowMs = RATE_LIMITS.aiGenerateImage.windowSec * 1000
  const bucket = Math.floor(now / windowMs)
  const reset = (bucket + 1) * windowMs
  const result = await redis.eval(
    `local count = tonumber(redis.call('GET', KEYS[1]) or '0')
     local limit = tonumber(ARGV[1])
     if count >= limit then return {0, count} end
     count = redis.call('INCR', KEYS[1])
     if count == 1 then redis.call('PEXPIREAT', KEYS[1], tonumber(ARGV[2])) end
     return {1, count}`,
    [dailyUsageKey(userId, now)],
    [AI_IMAGE_DAILY_LIMIT, reset],
  ) as number[]

  if (!Array.isArray(result) || result.length !== 2) throw new Error("AI image daily quota reservation returned an invalid result")
  const count = Number(result[1])
  return {
    allowed: Number(result[0]) === 1,
    count,
    limit: AI_IMAGE_DAILY_LIMIT,
    remaining: Math.max(0, AI_IMAGE_DAILY_LIMIT - count),
    reset,
  }
}

/** Read the actual run account's daily and between-purchase counters from Redis. */
export async function readAIImageQuota(userId: string) {
  const [purchaseCountResp, epochResp, dailyCountResp] = await Promise.all([
    redis.hget<number>(usageKey(userId), "count"),
    redis.hget<number>(usageKey(userId), "epoch"),
    redis.get<number>(dailyUsageKey(userId)),
  ])
  const purchaseCycleUsed = Number(purchaseCountResp ?? 0)
  const epoch = Number(epochResp ?? 0)
  const dailyUsed = Number(dailyCountResp ?? 0)

  return {
    dailyLimit: AI_IMAGE_DAILY_LIMIT,
    dailyUsed,
    dailyRemaining: Math.max(0, AI_IMAGE_DAILY_LIMIT - dailyUsed),
    purchaseCycleLimit: AI_IMAGE_PURCHASE_CYCLE_LIMIT,
    purchaseCycleUsed,
    purchaseCycleRemaining: Math.max(0, AI_IMAGE_PURCHASE_CYCLE_LIMIT - purchaseCycleUsed),
    epoch,
  }
}

/** Prepare a run-owned account at the boundary so Cypress can verify the real route without 50 paid generations. */
export async function prepareAIImageQuotaBoundaryForRun(userId: string) {
  const count = AI_IMAGE_PURCHASE_CYCLE_LIMIT - 1
  const result = await redis.eval(
    `local epoch = tonumber(redis.call('HGET', KEYS[1], 'epoch') or '0')
     redis.call('HSET', KEYS[1], 'count', tonumber(ARGV[1]))
     return {tonumber(ARGV[1]), epoch}`,
    [usageKey(userId)],
    [count],
  ) as number[]
  if (!Array.isArray(result) || result.length !== 2) throw new Error("Run-owned AI image quota setup returned an invalid result")

  return {
    dailyLimit: AI_IMAGE_DAILY_LIMIT,
    purchaseCycleLimit: AI_IMAGE_PURCHASE_CYCLE_LIMIT,
    purchaseCycleUsed: Number(result[0]),
    purchaseCycleRemaining: 1,
    epoch: Number(result[1]),
  }
}

/** Reserve one image slot atomically so concurrent clicks stay within the per-purchase cap. */
export async function reserveAIImageGeneration(userId: string): Promise<TAIImageQuotaReservation> {
  const result = await redis.eval(
    `local count = tonumber(redis.call('HGET', KEYS[1], 'count') or '0')
     local epoch = tonumber(redis.call('HGET', KEYS[1], 'epoch') or '0')
     local limit = tonumber(ARGV[1])
     if count >= limit then return {0, count, epoch} end
     count = redis.call('HINCRBY', KEYS[1], 'count', 1)
     return {1, count, epoch}`,
    [usageKey(userId)],
    [AI_IMAGE_PURCHASE_CYCLE_LIMIT],
  ) as number[]

  if (!Array.isArray(result) || result.length !== 3) throw new Error("AI image quota reservation returned an invalid result")
  return { allowed: Number(result[0]) === 1, count: Number(result[1]), epoch: Number(result[2]) }
}

/** Release a failed generation reservation without changing a newer post-purchase allowance. */
export async function releaseAIImageGeneration(userId: string, reservation: TAIImageQuotaReservation) {
  if (!reservation.allowed) return

  await redis.eval(
    `local epoch = tonumber(redis.call('HGET', KEYS[1], 'epoch') or '0')
     local reservedEpoch = tonumber(ARGV[1])
     if epoch ~= reservedEpoch then return 0 end
     local count = tonumber(redis.call('HGET', KEYS[1], 'count') or '0')
     if count < 1 then return 0 end
     return redis.call('HINCRBY', KEYS[1], 'count', -1)`,
    [usageKey(userId)],
    [reservation.epoch],
  )
}

/** A verified payment reference resets the account at most once. */
export async function resetAIImageQuotaAfterPurchase(userId: string, purchaseReference: string) {
  const result = await redis.eval(
    `if redis.call('SISMEMBER', KEYS[2], ARGV[1]) == 1 then
       return {0, tonumber(redis.call('HGET', KEYS[1], 'count') or '0'), tonumber(redis.call('HGET', KEYS[1], 'epoch') or '0')}
     end
     redis.call('SADD', KEYS[2], ARGV[1])
     redis.call('HSET', KEYS[1], 'count', 0)
     local epoch = redis.call('HINCRBY', KEYS[1], 'epoch', 1)
     return {1, 0, epoch}`,
    [usageKey(userId), PROCESSED_PURCHASES_KEY],
    [purchaseReference],
  ) as number[]

  if (!Array.isArray(result) || result.length !== 3) throw new Error("AI image quota reset returned an invalid result")
  return { reset: Number(result[0]) === 1, count: Number(result[1]), epoch: Number(result[2]) }
}

/** Remove quota state only through the run-owned E2E cleanup route before deleting its account. */
export async function clearRunOwnedAIImageQuota(userId: string) {
  const dailyWindowMs = RATE_LIMITS.aiGenerateImage.windowSec * 1000
  const currentBucket = Math.floor(Date.now() / dailyWindowMs)
  const keys = [
    usageKey(userId),
    dailyUsageKey(userId, currentBucket * dailyWindowMs),
    `${RATE_LIMITS.aiGenerateImage.key(userId)}:${currentBucket - 1}`,
  ]
  await redis.del(...keys)
  const remainingKeys = await Promise.all(keys.map(key => redis.exists(key)))
  if (remainingKeys.some(keyCount => keyCount !== 0)) {
    throw new Error("Run-owned AI image quota still exists after cleanup")
  }
  return { count: 0, keyAbsent: true, dailyKeysAbsent: true }
}
