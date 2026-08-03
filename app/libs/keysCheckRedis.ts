import { Redis } from "@upstash/redis"

import type { TKeyCheckReport } from "@/ts/types/TKeyCheckReport"

/**
 * The three things the weekly key check remembers between runs:
 *
 *   keys-check:23:last-run     -> ISO timestamp, so the webhook skips a run inside PROD_CHECK_EVERY_DAYS
 *   keys-check:23:last-report  -> the whole report, so you can read the last answer without a run
 *   keys-check:23:last-alert   -> which names were reported and when, so the same failure stays quiet
 *
 * `23` is in every key for the same reason `utm:23:device-id` has it (see app/libs/deviceIdRedis.ts):
 * projects 14/19/23/28/29 share one Upstash database. Without the number, 14_portfolio's weekly run
 * would overwrite this project's timestamp and each would report the other's state as its own.
 *
 * No expiry on any of them. A timestamp that quietly disappears would restart the every-7-days clock
 * and hide a cron that stopped firing, which is the one thing these keys exist to make visible.
 */
const PROJECT_KEY_PREFIX = "keys-check:23"

export type TKeysCheckAlert = {
  names: string[]
  sentAt: string
}

let redisClient: Redis | null = null

// eslint-disable-next-line local-rules/db-redis-verb-naming -- client getter (like getSupabaseServer), not a redis read
function getRedisClient(): Redis {
  if (!redisClient)
    redisClient = new Redis({ url: process.env.UPSTASH_REDIS_REST_URL, token: process.env.UPSTASH_REDIS_REST_TOKEN })
  return redisClient
}

export async function getRedisKeysCheckLastRun(): Promise<string | null> {
  const redis = getRedisClient()

  return redis.get<string>(`${PROJECT_KEY_PREFIX}:last-run`)
}

export async function setRedisKeysCheckLastRun(ranAt: string): Promise<void> {
  const redis = getRedisClient()
  await redis.set(`${PROJECT_KEY_PREFIX}:last-run`, ranAt)
}

export async function setRedisKeysCheckLastReport(report: TKeyCheckReport): Promise<void> {
  const redis = getRedisClient()
  await redis.set(`${PROJECT_KEY_PREFIX}:last-report`, report)
}

export async function getRedisKeysCheckLastAlert(): Promise<TKeysCheckAlert | null> {
  const redis = getRedisClient()

  return redis.get<TKeysCheckAlert>(`${PROJECT_KEY_PREFIX}:last-alert`)
}

export async function setRedisKeysCheckLastAlert(alert: TKeysCheckAlert): Promise<void> {
  const redis = getRedisClient()
  await redis.set(`${PROJECT_KEY_PREFIX}:last-alert`, alert)
}
