import { createHash, createHmac } from "node:crypto"
import { connect } from "node:tls"

import type { TKeyCheckReport } from "@/ts/types/TKeyCheckReport"
import type { TKeyProbe } from "@/ts/types/TKeyProbe"
import { parseTinifyApiKeys } from "@/utils/parseTinifyApiKeys"

/** Skip the pre-push run when the last green run is newer than this. */
export const PUSH_CHECK_EVERY_DAYS = 3

/** The webhook answers {"skipped":true} when the last prod run is newer than this. */
export const PROD_CHECK_EVERY_DAYS = 7

/** Remind about an already-reported key only this often. A newly broken key always goes out at once. */
export const REALERT_AFTER_DAYS = 28

/**
 * 20s, not 8s. A revoked key answers 401 in under a second, so this number never decides whether a key
 * is good - it only decides how long a slow network is given before the run gives up on a name. Set
 * too low it reports "no answer" for keys that are perfectly fine.
 */
const PROBE_TIMEOUT_MS = 20000
const PROBES_IN_FLIGHT = 8
const HEX_ADDRESS_PATTERN = /^0x[0-9a-fA-F]{40}$/

function readKey(name: string): string {
  return (process.env[name] ?? "").trim()
}

function describeStatus(status: number, body: string): string {
  const trimmedBody = body.replace(/\s+/g, " ").trim().slice(0, 120)

  return status === 0 ? trimmedBody || "no answer" : `${status} ${trimmedBody}`
}

async function requestKey(url: string, init?: RequestInit): Promise<{ status: number; body: string }> {
  const startedAt = Date.now()
  try {
    const resp = await fetch(url, { ...init, signal: AbortSignal.timeout(PROBE_TIMEOUT_MS) })

    return { status: resp.status, body: (await resp.text()).slice(0, 400) }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    const elapsedMs = Date.now() - startedAt
    // "The operation was aborted due to timeout" on its own hides which host was slow and by how much
    const isTimeout = message.includes("abort") || message.includes("timeout")

    return { status: 0, body: isTimeout ? `no answer in ${elapsedMs}ms from ${new URL(url).host}` : message }
  }
}

function basicAuth(user: string, password: string): string {
  return `Basic ${Buffer.from(`${user}:${password}`).toString("base64")}`
}

/**
 * For a probe that sends a deliberately incomplete request. Only a rejected key answers 401 or 403;
 * everything else - 400 for the missing parameter, 429 for a used-up monthly quota - means the service
 * read the key and accepted it. Pinning the exact success status instead would report a good key as
 * broken the day a service changes which 4xx it picks for a missing parameter.
 */
function passUnlessRejected(status: number, body: string): string | null {
  if (status === 0) return describeStatus(status, body)

  return status === 401 || status === 403 ? describeStatus(status, body) : null
}

/* ── shape probes ─────────────────────────────────────────────────────────────────────────────── */

function checkByteLength(value: string, wantedBytes: number): string | null {
  const decodedLength = /^[0-9a-fA-F]+$/.test(value) ? value.length / 2 : Buffer.from(value, "base64").length

  return decodedLength === wantedBytes ? null : `decodes to ${decodedLength} bytes, wanted ${wantedBytes}`
}

function checkPrefix(value: string, prefix: string): string | null {
  return value.startsWith(prefix) ? null : `does not start with ${prefix}`
}

function checkHexAddress(value: string): string | null {
  return HEX_ADDRESS_PATTERN.test(value) ? null : "is not an 0x address of 40 hex characters"
}

function checkUrl(value: string): string | null {
  try {
    return new URL(value).protocol.startsWith("http") ? null : "is not an http url"
  } catch {
    return "is not a url"
  }
}

function checkEmail(value: string): string | null {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ? null : "is not an email address"
}

function checkNumber(value: string): string | null {
  return Number.isFinite(Number(value)) ? null : "is not a number"
}

/* ── live probes ──────────────────────────────────────────────────────────────────────────────── */

/**
 * `/auth/v1/settings`, not `/rest/v1/`. PostgREST's root now answers an anon key with
 * `401 Only the service_role API key can be used for this endpoint`, so the root reports a perfectly
 * good anon key as revoked. The auth settings are what the browser reads with this key anyway.
 */
async function checkSupabaseAnonKey(anonKey: string): Promise<string | null> {
  const supabaseUrl = readKey("NEXT_PUBLIC_SUPABASE_URL")
  if (!supabaseUrl) return "needs NEXT_PUBLIC_SUPABASE_URL"

  const { status, body } = await requestKey(`${supabaseUrl}/auth/v1/settings`, { headers: { apikey: anonKey } })

  return status === 200 ? null : describeStatus(status, body)
}

async function checkSupabaseServiceRoleKey(serviceRoleKey: string): Promise<string | null> {
  const supabaseUrl = readKey("NEXT_PUBLIC_SUPABASE_URL")
  if (!supabaseUrl) return "needs NEXT_PUBLIC_SUPABASE_URL"

  const { status, body } = await requestKey(`${supabaseUrl}/auth/v1/admin/users?page=1&per_page=1`, {
    headers: { apikey: serviceRoleKey, Authorization: `Bearer ${serviceRoleKey}` },
  })

  return status === 200 ? null : describeStatus(status, body)
}

/**
 * Only that the host is up and serving Supabase. Any HTTP answer proves that, so a revoked anon key
 * fails on its own line instead of reporting the URL as broken too.
 */
async function checkSupabaseUrl(supabaseUrl: string): Promise<string | null> {
  const shapeReason = checkUrl(supabaseUrl)
  if (shapeReason) return shapeReason

  const { status, body } = await requestKey(`${supabaseUrl}/auth/v1/settings`)

  return status === 0 ? describeStatus(status, body) : null
}

async function checkUpstashRestToken(restToken: string): Promise<string | null> {
  const restUrl = readKey("UPSTASH_REDIS_REST_URL")
  if (!restUrl) return "needs UPSTASH_REDIS_REST_URL"

  const { status, body } = await requestKey(`${restUrl}/ping`, { headers: { Authorization: `Bearer ${restToken}` } })
  if (status !== 200) return describeStatus(status, body)

  return body.includes("PONG") ? null : `answered ${body.slice(0, 60)} instead of PONG`
}

/**
 * UPSTASH_REDIS_URL is the TCP address, so the REST ping above proves nothing about it. This opens a
 * TLS socket and speaks the two RESP commands by hand, which needs no package: `ioredis` is not a
 * dependency of this project, and the REST client only speaks HTTP.
 */
async function checkUpstashTcpUrl(tcpUrl: string): Promise<string | null> {
  let address: URL
  try {
    address = new URL(tcpUrl)
  } catch {
    return "is not a redis url"
  }

  if (!address.hostname || !address.password) return "has no host or password part"

  return new Promise<string | null>(resolve => {
    const socket = connect({
      host: address.hostname,
      port: Number(address.port) || 6379,
      servername: address.hostname,
    })
    let answered = false

    const finish = (reason: string | null) => {
      if (answered) return
      answered = true
      socket.destroy()
      resolve(reason)
    }

    // socket.setTimeout only counts idle time once there is a socket, so a connect that never lands
    // slips past it. This timer is the one that always fires. unref keeps it from holding node open.
    setTimeout(() => finish(`no answer within ${PROBE_TIMEOUT_MS / 1000}s`), PROBE_TIMEOUT_MS).unref()
    socket.setTimeout(PROBE_TIMEOUT_MS, () => finish(`no answer within ${PROBE_TIMEOUT_MS / 1000}s`))
    socket.on("secureConnect", () =>
      socket.write(`AUTH ${address.username || "default"} ${address.password}\r\nPING\r\n`),
    )
    socket.on("error", error => finish(error.message))
    socket.on("data", chunk => {
      const answer = chunk.toString()
      if (answer.includes("+PONG")) return finish(null)
      if (answer.startsWith("-")) return finish(answer.split("\r\n")[0].slice(1))
    })
  })
}

async function checkStripeSecretKey(secretKey: string): Promise<string | null> {
  const { status, body } = await requestKey("https://api.stripe.com/v1/balance", {
    headers: { Authorization: `Bearer ${secretKey}` },
  })

  return status === 200 ? null : describeStatus(status, body)
}

/**
 * Creating a token is the one thing a publishable key is allowed to do, so that is what this asks for.
 * Reading a token answers `403 secret_key_required` even for a good key, which is why the retrieve
 * request was the wrong question to ask.
 */
async function checkStripePublishableKey(publishableKey: string): Promise<string | null> {
  const { status, body } = await requestKey("https://api.stripe.com/v1/tokens", {
    method: "POST",
    headers: { Authorization: basicAuth(publishableKey, ""), "Content-Type": "application/x-www-form-urlencoded" },
  })

  return passUnlessRejected(status, body)
}

/** One signed request proves PUSHER_APP_ID, NEXT_PUBLIC_PUSHER_APP_KEY and PUSHER_SECRET together. */
async function checkPusherSecret(pusherSecret: string): Promise<string | null> {
  const appId = readKey("PUSHER_APP_ID")
  const appKey = readKey("NEXT_PUBLIC_PUSHER_APP_KEY")
  if (!appId || !appKey) return "needs PUSHER_APP_ID and NEXT_PUBLIC_PUSHER_APP_KEY"

  const path = `/apps/${appId}/channels`
  const query = `auth_key=${appKey}&auth_timestamp=${Math.floor(Date.now() / 1000)}&auth_version=1.0`
  const signature = createHmac("sha256", pusherSecret).update(`GET\n${path}\n${query}`).digest("hex")
  const { status, body } = await requestKey(`https://api-eu.pusher.com${path}?${query}&auth_signature=${signature}`)

  return status === 200 ? null : describeStatus(status, body)
}

async function checkTelegramBotToken(botToken: string): Promise<string | null> {
  const { status, body } = await requestKey(`https://api.telegram.org/bot${botToken}/getMe`)

  return status === 200 ? null : describeStatus(status, body)
}

/** Read-only, same as getMe - it also proves the bot is still a member of that chat. */
async function checkTelegramChatId(chatId: string): Promise<string | null> {
  const botToken = readKey("TELEGRAM_BOT_TOKEN")
  if (!botToken) return "needs TELEGRAM_BOT_TOKEN"

  const { status, body } = await requestKey(
    `https://api.telegram.org/bot${botToken}/getChat?chat_id=${encodeURIComponent(chatId)}`,
  )

  return status === 200 ? null : describeStatus(status, body)
}

/**
 * siteverify answers `invalid-input-response` when the secret is good and only the token was junk,
 * and `invalid-input-secret` when the secret itself was revoked. So the first answer is the pass.
 */
async function checkTurnstileSecretKey(secretKey: string): Promise<string | null> {
  const { status, body } = await requestKey("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `secret=${encodeURIComponent(secretKey)}&response=not-a-real-token`,
  })
  if (status !== 200) return describeStatus(status, body)
  if (body.includes("invalid-input-secret")) return "revoked - siteverify answered invalid-input-secret"

  return body.includes("invalid-input-response") ? null : `siteverify answered ${body.slice(0, 80)}`
}

async function checkOpenaiApiKey(apiKey: string): Promise<string | null> {
  const { status, body } = await requestKey("https://api.openai.com/v1/models", {
    headers: { Authorization: `Bearer ${apiKey}` },
  })

  return status === 200 ? null : describeStatus(status, body)
}

async function checkResendSecret(resendSecret: string): Promise<string | null> {
  const { status, body } = await requestKey("https://api.resend.com/domains", {
    headers: { Authorization: `Bearer ${resendSecret}` },
  })

  return status === 200 ? null : describeStatus(status, body)
}

async function checkPineconeApiKey(apiKey: string): Promise<string | null> {
  const indexName = readKey("PINECONE_INDEX")
  if (!indexName) return "needs PINECONE_INDEX"

  const { status, body } = await requestKey(`https://api.pinecone.io/indexes/${indexName}`, {
    headers: { "Api-Key": apiKey, "X-Pinecone-API-Version": "2025-04" },
  })

  return status === 200 ? null : describeStatus(status, body)
}

/**
 * PINECONE_ENVIRONMENT holds the index host, because `getPineconeHost` in
 * `app/libs/ai/chatMemory.ts` passes whatever it holds straight to the client as `host`.
 *
 * The dot check is first so a legacy region name (`us-east-1-aws`, `gcp-starter`) is named for what it
 * is straight away, instead of after a 20 second wait for DNS to fail on a hostname that never existed.
 */
async function checkPineconeHost(hostUrl: string): Promise<string | null> {
  const apiKey = readKey("PINECONE_API_KEY")
  if (!apiKey) return "needs PINECONE_API_KEY"
  if (!hostUrl.includes("."))
    return `"${hostUrl}" is a legacy region name, not an index host - chat memory needs the *.pinecone.io host`

  const address = hostUrl.startsWith("http") ? hostUrl : `https://${hostUrl}`
  const { status, body } = await requestKey(`${address}/describe_index_stats`, {
    headers: { "Api-Key": apiKey, "X-Pinecone-API-Version": "2025-04" },
  })

  return status === 200 ? null : describeStatus(status, body)
}

async function checkCoinmarketcapSecret(secret: string): Promise<string | null> {
  const { status, body } = await requestKey("https://pro-api.coinmarketcap.com/v1/key/info", {
    headers: { "X-CMC_PRO_API_KEY": secret },
  })

  return status === 200 ? null : describeStatus(status, body)
}

/**
 * A key that has used up its monthly compressions is still a valid key, so 429 counts as a pass here -
 * only 401 means Tinify no longer knows this key.
 */
async function checkOneTinifyKey(apiKey: string): Promise<string | null> {
  const { status, body } = await requestKey("https://api.tinify.com/shrink", {
    method: "POST",
    headers: { Authorization: basicAuth("api", apiKey) },
  })

  return passUnlessRejected(status, body)
}

async function checkTinifyApiKeyArr(rawApiKeys: string): Promise<string | null> {
  const apiKeys = parseTinifyApiKeys(rawApiKeys)
  if (!apiKeys.length) return "holds no key"

  const reasons = await Promise.all(apiKeys.map(apiKey => checkOneTinifyKey(apiKey)))
  const broken = reasons.map((reason, index) => (reason ? `[${index}] ${reason}` : null)).filter(Boolean)

  return broken.length ? broken.join(", ") : null
}

/**
 * STS GetCallerIdentity signed by hand with SigV4. The AWS SDK would need a different client in every
 * project (lambda here, S3 in 26, scheduler in 14), while this one function copies over unchanged.
 */
async function checkAwsSecretAccessKey(secretAccessKey: string): Promise<string | null> {
  const accessKeyId = readKey("AWS_ACCESS_KEY_ID")
  const region = readKey("NEXT_PUBLIC_AWS_REGION") || "eu-central-1"
  if (!accessKeyId) return "needs AWS_ACCESS_KEY_ID"

  const host = `sts.${region}.amazonaws.com`
  const requestBody = "Action=GetCallerIdentity&Version=2011-06-15"
  const amzDate = new Date().toISOString().replace(/[:-]|\.\d{3}/g, "")
  const dateStamp = amzDate.slice(0, 8)
  const contentType = "application/x-www-form-urlencoded; charset=utf-8"
  const signedHeaders = "content-type;host;x-amz-date"
  const canonicalRequest = [
    "POST",
    "/",
    "",
    `content-type:${contentType}`,
    `host:${host}`,
    `x-amz-date:${amzDate}`,
    "",
    signedHeaders,
    createHash("sha256").update(requestBody).digest("hex"),
  ].join("\n")

  const scope = `${dateStamp}/${region}/sts/aws4_request`
  const stringToSign = [
    "AWS4-HMAC-SHA256",
    amzDate,
    scope,
    createHash("sha256").update(canonicalRequest).digest("hex"),
  ].join("\n")

  const dateKey = createHmac("sha256", `AWS4${secretAccessKey}`).update(dateStamp).digest()
  const regionKey = createHmac("sha256", dateKey).update(region).digest()
  const serviceKey = createHmac("sha256", regionKey).update("sts").digest()
  const signingKey = createHmac("sha256", serviceKey).update("aws4_request").digest()
  const signature = createHmac("sha256", signingKey).update(stringToSign).digest("hex")

  const { status, body } = await requestKey(`https://${host}/`, {
    method: "POST",
    headers: {
      "Content-Type": contentType,
      "X-Amz-Date": amzDate,
      Authorization: `AWS4-HMAC-SHA256 Credential=${accessKeyId}/${scope}, SignedHeaders=${signedHeaders}, Signature=${signature}`,
    },
    body: requestBody,
  })

  return status === 200 ? null : describeStatus(status, body)
}

async function checkProductionUrl(productionUrl: string): Promise<string | null> {
  const shapeReason = checkUrl(productionUrl)
  if (shapeReason) return shapeReason

  const { status, body } = await requestKey(productionUrl, { method: "HEAD" })

  return status >= 200 && status < 400 ? null : describeStatus(status, body)
}

/* ── the registry ─────────────────────────────────────────────────────────────────────────────── */

/**
 * Every name declared in `env.d.ts`. `tests/keys.test.mjs` asserts that this list holds the same names
 * as `env.d.ts` and `.env.example`, so a name added to one of those files and forgotten here fails the
 * next push instead of going unchecked forever.
 */
export const KEY_PROBES: TKeyProbe[] = [
  { name: "NEXT_PUBLIC_PRODUCTION_URL", tier: "live", check: checkProductionUrl },

  { name: "NEXT_PUBLIC_SUPABASE_URL", tier: "live", check: checkSupabaseUrl },
  { name: "NEXT_PUBLIC_SUPABASE_ANON_KEY", tier: "live", check: checkSupabaseAnonKey },
  { name: "SUPABASE_SERVICE_ROLE_KEY", tier: "live", check: checkSupabaseServiceRoleKey },

  { name: "UPSTASH_REDIS_REST_URL", tier: "shape", check: checkUrl },
  { name: "UPSTASH_REDIS_REST_TOKEN", tier: "live", check: checkUpstashRestToken },
  { name: "UPSTASH_REDIS_URL", tier: "live", check: checkUpstashTcpUrl },

  { name: "AWS_ACCESS_KEY_ID", tier: "shape", check: value => checkPrefix(value, "AKIA") },
  { name: "AWS_SECRET_ACCESS_KEY", tier: "live", check: checkAwsSecretAccessKey },
  { name: "NEXT_PUBLIC_AWS_REGION", tier: "shape", check: value => checkPrefix(value, "eu-") },

  { name: "PUSHER_APP_ID", tier: "shape", check: checkNumber },
  { name: "NEXT_PUBLIC_PUSHER_APP_KEY", tier: "skip" },
  { name: "PUSHER_SECRET", tier: "live", check: checkPusherSecret },

  { name: "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY", tier: "live", check: checkStripePublishableKey },
  { name: "NEXT_STRIPE_SECRET_KEY", tier: "live", check: checkStripeSecretKey },

  { name: "NEXT_RESEND_SECRET", tier: "live", check: checkResendSecret },
  { name: "NEXT_PUBLIC_SUPPORT_EMAIL", tier: "shape", check: checkEmail },
  { name: "NEXT_PUBLIC_SUPPORT_NOTIFICATION_EMAIL", tier: "shape", check: checkEmail },

  { name: "NEXT_PUBLIC_CLOUDFLARE_SITE_KEY", tier: "shape", check: value => checkPrefix(value, "0x") },
  { name: "TURNSTILE_SECRET_KEY", tier: "live", check: checkTurnstileSecretKey },

  { name: "PINECONE_INDEX", tier: "skip" },
  // getPineconeHost in app/libs/ai/chatMemory.ts reads PINECONE_HOST || PINECONE_ENVIRONMENT, and
  // PINECONE_HOST is no longer declared, so PINECONE_ENVIRONMENT is the one that has to hold a value.
  { name: "PINECONE_ENVIRONMENT", tier: "live", check: checkPineconeHost },
  { name: "PINECONE_API_KEY", tier: "live", check: checkPineconeApiKey },

  { name: "NEXT_PUBLIC_METAMASK_ADRESS_ETH", tier: "shape", check: checkHexAddress },
  { name: "NEXT_PUBLIC_METAMASK_ADRESS_BNB", tier: "shape", check: checkHexAddress },
  { name: "NEXT_PUBLIC_METAMASK_ADRESS_MATIC", tier: "shape", check: checkHexAddress },

  { name: "OPENAI_API_KEY", tier: "live", check: checkOpenaiApiKey },
  { name: "PRICE_WEBHOOK_SECRET", tier: "skip" },
  { name: "CRON_SECRET", tier: "skip" },

  { name: "NEXT_COINMARKETCAP_SECRET", tier: "live", check: checkCoinmarketcapSecret },

  { name: "TELEGRAM_BOT_TOKEN", tier: "live", check: checkTelegramBotToken },
  { name: "TELEGRAM_CHAT_ID", tier: "live", check: checkTelegramChatId },
  { name: "NEXT_PUBLIC_TELEGRAM_URL", tier: "shape", check: checkUrl },

  { name: "TINIFY_API_KEY_ARR", tier: "live", check: checkTinifyApiKeyArr },

  { name: "CHROMATIC_PROJECT_TOKEN", tier: "shape", check: value => checkPrefix(value, "chpt_") },

  { name: "DEVICE_ID_ENCRYPTION_KEY", tier: "shape", check: value => checkByteLength(value, 32) },

  { name: "NEXT_PUBLIC_IS_DEBUG", tier: "skip" },
]

/* ── the runner ───────────────────────────────────────────────────────────────────────────────── */

/**
 * Presence runs first for every name, whatever its tier - `undefined` or an empty value fails right
 * there and the probe is not attempted. That is what catches a name declared in `.env.example` and
 * never set on Vercel.
 */
export async function runOneKeyProbe(probe: TKeyProbe): Promise<{ name: string; reason: string } | null> {
  const value = readKey(probe.name)
  if (!value) {
    if (probe.optionalWhen && readKey(probe.optionalWhen)) return null

    const alsoEmpty = probe.optionalWhen ? ` and so is ${probe.optionalWhen}, the app reads one of the two` : ""

    return { name: probe.name, reason: `missing - declared, value is empty${alsoEmpty}` }
  }
  if (!probe.check) return null

  // The last line of defence. Every probe already limits its own request, so reaching this means one
  // of them found a way to wait forever, and the run still ends with a named reason instead of hanging.
  const reason = await Promise.race([
    Promise.resolve(probe.check(value)),
    new Promise<string>(resolve => {
      setTimeout(() => resolve(`no answer within ${(PROBE_TIMEOUT_MS + 2000) / 1000}s`), PROBE_TIMEOUT_MS + 2000).unref()
    }),
  ])

  return reason ? { name: probe.name, reason } : null
}

/**
 * `onProbeDone` runs after each name finishes so the caller prints as it goes. Without it the whole
 * run is 40 seconds of silence and looks stopped.
 *
 * The probes run through a queue rather than fixed groups: one slow name (PayPal takes seconds) would
 * otherwise hold back the seven names next to it.
 */
export async function runKeyChecks(
  probes: TKeyProbe[] = KEY_PROBES,
  onProbeDone?: (name: string, reason: string | null, doneCount: number, total: number, elapsedMs: number) => void,
): Promise<TKeyCheckReport> {
  const failures: { name: string; reason: string }[] = []
  let nextIndex = 0
  let doneCount = 0

  const runFromQueue = async () => {
    while (nextIndex < probes.length) {
      const probe = probes[nextIndex++]
      const startedAt = Date.now()
      const failure = await runOneKeyProbe(probe)
      doneCount += 1
      if (failure) failures.push(failure)
      onProbeDone?.(probe.name, failure?.reason ?? null, doneCount, probes.length, Date.now() - startedAt)
    }
  }

  await Promise.all(Array.from({ length: Math.min(PROBES_IN_FLIGHT, probes.length) }, () => runFromQueue()))
  failures.sort(
    (first, second) =>
      probes.findIndex(probe => probe.name === first.name) - probes.findIndex(probe => probe.name === second.name),
  )

  return {
    ok: failures.length === 0,
    failures,
    liveCount: probes.filter(probe => probe.tier === "live").length,
    shapeCount: probes.filter(probe => probe.tier === "shape").length,
    skipCount: probes.filter(probe => probe.tier === "skip").length,
    ranAt: new Date().toISOString(),
  }
}

export function daysSince(isoTimestamp: string | null | undefined): number | null {
  if (!isoTimestamp) return null
  const happenedAt = Date.parse(isoTimestamp)

  return Number.isNaN(happenedAt) ? null : (Date.now() - happenedAt) / (24 * 60 * 60 * 1000)
}

/**
 * Silence is the healthy state, so this decides when breaking it is worth it:
 *
 *   a name that was not broken last time -> send now, that is news
 *   the very same names as last time     -> stay quiet until REALERT_AFTER_DAYS has passed
 *
 * Without the second rule one revoked key sends a message every single week until it is fixed, and a
 * report you have already read teaches you to ignore the next one.
 */
export function shouldSendKeyAlert(
  failingNames: string[],
  lastAlert: { names: string[]; sentAt: string } | null,
): boolean {
  if (!lastAlert) return true

  const isSameSet =
    lastAlert.names.length === failingNames.length && failingNames.every(name => lastAlert.names.includes(name))
  if (!isSameSet) return true

  const daysSinceAlert = daysSince(lastAlert.sentAt)

  return daysSinceAlert === null || daysSinceAlert >= REALERT_AFTER_DAYS
}

/** One streaming line, shared by `pnpm test:keys` and the pre-push run so both read the same. */
export function formatKeyProgressLine(
  name: string,
  reason: string | null,
  doneCount: number,
  total: number,
  elapsedMs: number,
): string {
  const counter = `${String(doneCount).padStart(2)}/${total}`

  return `  ${counter} ${String(elapsedMs).padStart(6)}ms  ${reason ? "✘" : "✔"} ${name}${reason ? ` — ${reason}` : ""}\n`
}

/** The message body the Telegram alert and the email both send. */
export function formatKeyCheckReport(projectName: string, report: TKeyCheckReport): string {
  const namesCount = report.liveCount + report.shapeCount + report.skipCount
  if (report.ok) return `${projectName} — all ${namesCount} names OK · ${report.liveCount} proved by a request`

  return [
    `${projectName} — ${report.failures.length} key${report.failures.length === 1 ? "" : "s"} need you`,
    "",
    ...report.failures.map(failure => `✘ ${failure.name} — ${failure.reason}`),
    "",
    `✔ ${namesCount - report.failures.length} other names OK · ${report.shapeCount} shape-checked`,
  ].join("\n")
}
