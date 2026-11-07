import { execFile } from "node:child_process"
import path from "node:path"
import { promisify } from "node:util"
import { fileURLToPath, pathToFileURL } from "node:url"

import { readOrCreateStackEnv } from "./local-data-stack.mjs"

const execFileAsync = promisify(execFile)
const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..")
const composeFile = path.join(repositoryRoot, "docker/e2e-weekly/docker-compose.yml")
const stackFile = path.join(repositoryRoot, "docker/e2e-weekly/runtime/stack.env")
const dataServices = ["db", "auth", "rest", "gateway", "redis", "redis-http"]

function hasSupabase(environment) {
  return Boolean(environment.NEXT_PUBLIC_SUPABASE_URL && environment.NEXT_PUBLIC_SUPABASE_ANON_KEY && environment.SUPABASE_SERVICE_ROLE_KEY)
}

function hasRedis(environment) {
  return Boolean(environment.UPSTASH_REDIS_REST_URL && environment.UPSTASH_REDIS_REST_TOKEN)
}

async function waitForHttp(url, acceptStatus, headers) {
  const host = new URL(url).host
  let lastStatus = 0
  for (let attempt = 0; attempt < 90; attempt += 1) {
    try {
      const response = await fetch(url, {
        ...(headers ? { headers } : {}),
        signal: AbortSignal.timeout(2000),
      })
      lastStatus = response.status
      await response.body?.cancel()
      if (acceptStatus(response.status)) return
    } catch {
      // The container is still starting.
      lastStatus = 0
    }
    await new Promise(resolve => setTimeout(resolve, 2000))
  }
  const detail = lastStatus ? `HTTP ${lastStatus}` : "no HTTP response"
  throw new Error(`No answer from ${host} (${detail})`)
}

function redact(detail, secrets) {
  return [secrets.POSTGRES_PASSWORD, secrets.JWT_SECRET, secrets.ANON_KEY, secrets.SERVICE_ROLE_KEY, secrets.REDIS_HTTP_TOKEN]
    .filter(Boolean)
    .reduce((text, secret) => text.split(secret).join("[redacted]"), detail)
}

async function startCompose() {
  const secrets = await readOrCreateStackEnv(stackFile)
  try {
    await execFileAsync("docker", [
      "compose",
      "--project-name", "23-store-e2e",
      "--env-file", stackFile,
      "-f", composeFile,
      "up", "-d",
      ...dataServices,
    ], { cwd: repositoryRoot })
  } catch (error) {
    const detail = redact(`${error.stderr ?? ""}\n${error.message ?? ""}`, secrets)
    throw new Error(`Docker data services did not start. ${detail.slice(0, 500)}`)
  }
  return secrets
}

export async function ensureDataServices(environment = process.env) {
  const nextEnvironment = { ...environment }
  const needsSupabase = !hasSupabase(nextEnvironment)
  const needsRedis = !hasRedis(nextEnvironment)
  if (!needsSupabase && !needsRedis) return nextEnvironment

  const localSupabaseReady = Boolean(nextEnvironment.E2E_LOCAL_SUPABASE_URL && nextEnvironment.ANON_KEY && nextEnvironment.SERVICE_ROLE_KEY)
  const localRedisReady = Boolean(nextEnvironment.E2E_LOCAL_REDIS_URL && nextEnvironment.REDIS_HTTP_TOKEN)
  const secrets = (needsSupabase && !localSupabaseReady) || (needsRedis && !localRedisReady) ? await startCompose() : null
  if (needsSupabase) {
    nextEnvironment.NEXT_PUBLIC_SUPABASE_URL = localSupabaseReady ? nextEnvironment.E2E_LOCAL_SUPABASE_URL : "http://127.0.0.1:54321"
    nextEnvironment.NEXT_PUBLIC_SUPABASE_ANON_KEY = localSupabaseReady ? nextEnvironment.ANON_KEY : secrets.ANON_KEY
    nextEnvironment.SUPABASE_SERVICE_ROLE_KEY = localSupabaseReady ? nextEnvironment.SERVICE_ROLE_KEY : secrets.SERVICE_ROLE_KEY
  }
  if (needsRedis) {
    nextEnvironment.UPSTASH_REDIS_REST_URL = localRedisReady ? nextEnvironment.E2E_LOCAL_REDIS_URL : "http://127.0.0.1:8079"
    nextEnvironment.UPSTASH_REDIS_REST_TOKEN = localRedisReady ? nextEnvironment.REDIS_HTTP_TOKEN : secrets.REDIS_HTTP_TOKEN
  }
  // Hosted Auth answers /auth/v1/health with HTTP 401 unless the anon key is sent.
  const supabaseHeaders = nextEnvironment.NEXT_PUBLIC_SUPABASE_ANON_KEY
    ? { apikey: nextEnvironment.NEXT_PUBLIC_SUPABASE_ANON_KEY }
    : undefined
  await waitForHttp(
    `${nextEnvironment.NEXT_PUBLIC_SUPABASE_URL.replace(/\/$/, "")}/auth/v1/health`,
    status => status >= 200 && status < 300,
    supabaseHeaders,
  )
  await waitForHttp(nextEnvironment.UPSTASH_REDIS_REST_URL, status => status < 500)
  return nextEnvironment
}

const isDirectRun = process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href
if (isDirectRun) {
  ensureDataServices().then(environment => {
    console.log(JSON.stringify({
      supabaseHost: new URL(environment.NEXT_PUBLIC_SUPABASE_URL).host,
      redisHost: new URL(environment.UPSTASH_REDIS_REST_URL).host,
    }))
  }).catch(error => {
    console.error(error.message)
    process.exitCode = 1
  })
}
