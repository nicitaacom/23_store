import { Redis } from "@upstash/redis"

import { sendTelegramMessage } from "@/utils/sendTelegramMessage"

const ALERT_KEY_PREFIX = "store-alert:23"
const DAY_SECONDS = 86_400
const FINLAND_DATE = new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Helsinki" })
const TOAST_ALERT_THRESHOLD = 10
const MAX_DAILY_TOAST_ALERTS = 3

const countAndClaim = `
  if redis.call('exists', KEYS[2]) == 1 then return 0 end
  local count = redis.call('incr', KEYS[1])
  if count == 1 then redis.call('expire', KEYS[1], ARGV[2]) end
  if count < tonumber(ARGV[1]) then return 0 end
  if ARGV[4] ~= '0' then
    local alerts = tonumber(redis.call('get', KEYS[3]) or '0')
    if alerts >= tonumber(ARGV[4]) then return 0 end
    if redis.call('incr', KEYS[3]) == 1 then redis.call('expire', KEYS[3], ARGV[2]) end
  end
  redis.call('set', KEYS[2], ARGV[3], 'EX', ARGV[5])
  return count
`

const finishClaim = `
  if redis.call('get', KEYS[1]) ~= ARGV[1] then return 0 end
  if ARGV[2] == '1' then redis.call('set', KEYS[1], 'sent', 'EX', ARGV[3])
  else
    redis.call('del', KEYS[1])
    if ARGV[4] ~= '0' then redis.call('decr', KEYS[2]) end
  end
  return 1
`

function getAlertRedis() {
  if (process.env.VERCEL_ENV !== "production") return null
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) return null
  if (!process.env.TELEGRAM_BOT_TOKEN || !process.env.TELEGRAM_CHAT_ID) return null
  return Redis.fromEnv()
}

async function sendDailyAlert(redis: Redis, key: string, threshold: number, getMessage: (count: number) => string, dailyLimit = 0) {
  const prefix = `${ALERT_KEY_PREFIX}:${FINLAND_DATE.format(new Date())}`
  const alertKey = `${prefix}:${key}:telegram`
  const budgetKey = `${prefix}:toast-alerts`
  const claim = crypto.randomUUID()
  const count = await redis.eval<[number, number, string, number, number], number>(countAndClaim, [`${prefix}:${key}:count`, alertKey, budgetKey], [
    threshold, DAY_SECONDS, claim, dailyLimit, DAY_SECONDS,
  ])
  if (!count) return

  let sent = false
  try {
    const response = await sendTelegramMessage(getMessage(count), AbortSignal.timeout(5000))
    sent = response.ok
    if (!sent) console.error("[store-alerts] Telegram rejected a notification", response.status)
  } catch (error) {
    console.error("[store-alerts] Telegram request failed", error instanceof Error ? error.name : "UnknownError")
  } finally {
    try {
      await redis.eval(finishClaim, [alertKey, budgetKey], [claim, sent ? 1 : 0, DAY_SECONDS, dailyLimit])
    } catch (error) {
      // Preserve the daily deduplication window if Telegram accepted the alert but Redis could not finalize it.
      console.error("[store-alerts] Could not finalize the Telegram alert claim", error instanceof Error ? error.name : "UnknownError")
    }
  }
}

export function isSupabaseOutageStatus(status: number) {
  return status === 0 || [401, 402, 403, 404, 429].includes(status) || status >= 500
}

export async function reportSupabaseOutage(status: number) {
  const redis = getAlertRedis()
  if (!redis || !isSupabaseOutageStatus(status)) return

  const quotaRestricted = status === 402
  try {
    await sendDailyAlert(redis, quotaRestricted ? "supabase-quota" : "supabase-outage", 1, () =>
      `jokik.fi | ${quotaRestricted ? "Supabase usage restriction" : "Supabase catalog unavailable"}\n` +
      `${status ? `Catalog database returned HTTP ${status}.` : "The catalog database did not respond."}\n` +
      "Check Supabase Usage and Logs.")
  } catch {
    console.error("[store-alerts] Could not record the Supabase incident")
  }
}

export async function reportErrorToast(fingerprint: string, clientKey: string) {
  const redis = getAlertRedis()
  if (!redis) return

  try {
    const clientWindow = Math.floor(Date.now() / 60_000)
    const clientCount = await redis.eval<[], number>(
      "local count = redis.call('incr', KEYS[1]); if count == 1 then redis.call('expire', KEYS[1], 120) end; return count",
      [`${ALERT_KEY_PREFIX}:toast-client:${clientKey}:${clientWindow}`],
      [],
    )
    if (clientCount > 30) return

    await sendDailyAlert(redis, `toast:${fingerprint}`, TOAST_ALERT_THRESHOLD, count => {
      console.warn("[store-alerts] Repeated storefront error", { fingerprint, count })
      return `jokik.fi | Repeated storefront error\n${count} matching error notifications today.\n` +
        `Error ID ${fingerprint.slice(0, 12)}. Check Vercel Runtime Logs for store-alerts.`
    }, MAX_DAILY_TOAST_ALERTS)
  } catch {
    console.error("[store-alerts] Could not count a storefront error")
  }
}
