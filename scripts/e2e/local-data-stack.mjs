import { randomBytes, createHmac } from "node:crypto"
import { access, mkdir, readFile, writeFile } from "node:fs/promises"
import path from "node:path"

const STACK_KEYS = ["POSTGRES_PASSWORD", "JWT_SECRET", "ANON_KEY", "SERVICE_ROLE_KEY", "REDIS_HTTP_TOKEN"]

export function signRoleJwt(role, secret, issuedAtSeconds) {
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url")
  const body = Buffer.from(JSON.stringify({
    role,
    iss: "supabase",
    iat: issuedAtSeconds,
    exp: issuedAtSeconds + 60 * 60 * 24 * 3650,
  })).toString("base64url")
  const signature = createHmac("sha256", secret).update(`${header}.${body}`).digest("base64url")
  return `${header}.${body}.${signature}`
}

export function createStackSecrets() {
  const jwtSecret = randomBytes(48).toString("base64url")
  const issuedAtSeconds = Math.floor(Date.now() / 1000)
  return {
    POSTGRES_PASSWORD: randomBytes(24).toString("base64url"),
    JWT_SECRET: jwtSecret,
    ANON_KEY: signRoleJwt("anon", jwtSecret, issuedAtSeconds),
    SERVICE_ROLE_KEY: signRoleJwt("service_role", jwtSecret, issuedAtSeconds),
    REDIS_HTTP_TOKEN: randomBytes(24).toString("base64url"),
  }
}

export function serializeStackEnv(secrets) {
  return `${STACK_KEYS.map(key => `${key}=${secrets[key]}`).join("\n")}\n`
}

export function parseStackEnv(text) {
  const values = {}
  for (const line of text.split("\n")) {
    if (!line || line.startsWith("#")) continue
    const splitAt = line.indexOf("=")
    if (splitAt <= 0) continue
    values[line.slice(0, splitAt)] = line.slice(splitAt + 1)
  }
  return values
}

export async function readOrCreateStackEnv(filePath) {
  try {
    await access(filePath)
    const existing = parseStackEnv(await readFile(filePath, "utf8"))
    const missing = STACK_KEYS.filter(key => !existing[key])
    if (missing.length) throw new Error(`Stack file is missing ${missing.join(", ")}`)
    return existing
  } catch (error) {
    if (error && error.code !== "ENOENT") throw error
  }
  const secrets = createStackSecrets()
  await mkdir(path.dirname(filePath), { recursive: true })
  await writeFile(filePath, serializeStackEnv(secrets), { mode: 0o600 })
  return secrets
}
