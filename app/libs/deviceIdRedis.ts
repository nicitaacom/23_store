import { Redis } from "@upstash/redis"

/**
 * Layers 3 and 4 of the visitor identity:
 *
 *   utm:device-id:by-ip:<ip>                 -> deviceId, expiring at midnight in the visitor's timezone
 *   utm:device-id:by-fingerprint:<sha256>    -> deviceId, expiring 10 minutes after it was written
 *
 * The IP layer gets the day-long expiry because an address is stronger evidence than a fingerprint
 * match, which is a probability - a different browser on similar hardware tells the server nothing
 * definite, so 10 minutes means a coincidental match bridges one short session rather than claiming
 * someone else's deviceId for the rest of the day.
 */
const FINGERPRINT_TTL_SECONDS = 600
const FINGERPRINT_PATTERN = /^[0-9a-f]{64}$/

let redisClient: Redis | null = null

// eslint-disable-next-line local-rules/db-redis-verb-naming -- factory/client getter (like getSupabaseServer), not a redis read
function getRedisClient(): Redis {
  if (!redisClient) redisClient = Redis.fromEnv()
  return redisClient
}

function getDeviceIdByIpKey(ip: string): string {
  return `utm:device-id:by-ip:${ip}`
}

function getDeviceIdByFingerprintKey(fingerprint: string): string {
  return `utm:device-id:by-fingerprint:${fingerprint}`
}

export async function getRedisDeviceIdByIp(ip: string): Promise<string | null> {
  const redis = getRedisClient()

  return redis.get<string>(getDeviceIdByIpKey(ip))
}

export async function setRedisDeviceIdByIp(ip: string, deviceId: string, visitorDayEnd: Date): Promise<void> {
  const redis = getRedisClient()
  await redis.set(getDeviceIdByIpKey(ip), deviceId, { exat: Math.floor(visitorDayEnd.getTime() / 1000) })
}

/**
 * The fingerprint reaches the server as an action argument, so its shape is checked before it becomes
 * a key - `computeFingerprint` only ever returns a sha256 hex digest, but without this check a caller
 * sends a megabyte of text and has it written to Redis as a key.
 */
export async function getRedisDeviceIdByFingerprint(fingerprint: string): Promise<string | null> {
  if (!FINGERPRINT_PATTERN.test(fingerprint)) return null
  const redis = getRedisClient()

  return redis.get<string>(getDeviceIdByFingerprintKey(fingerprint))
}

export async function setRedisDeviceIdByFingerprint(fingerprint: string, deviceId: string): Promise<void> {
  if (!FINGERPRINT_PATTERN.test(fingerprint)) return
  const redis = getRedisClient()
  await redis.set(getDeviceIdByFingerprintKey(fingerprint), deviceId, { ex: FINGERPRINT_TTL_SECONDS })
}
