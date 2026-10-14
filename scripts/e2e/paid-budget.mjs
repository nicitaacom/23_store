import { appendFile, mkdir, readFile, writeFile } from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..")
const sensitiveFieldPattern = /authorization|cookie|password|secret|token|wallet|signed.?url|reset.?link/i

function redact(value, parentKey = "") {
  if (sensitiveFieldPattern.test(parentKey)) return "[REDACTED]"
  if (Array.isArray(value)) return value.map(item => redact(item))
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, child]) => [key, redact(child, key)]))
  }
  if (typeof value !== "string") return value
  return value
    .replace(/Bearer\s+[^\s,;]+/gi, "Bearer [REDACTED]")
    .replace(/([?&](?:X-Amz-Signature|X-Amz-Credential|signature|token|access_token)=)[^&\s]+/gi, "$1[REDACTED]")
}

function getJournalPath(environment) {
  const artifactDirectory = path.resolve(repositoryRoot, environment.E2E_ARTIFACT_DIR ?? "artifacts/e2e")
  return { artifactDirectory, journalPath: path.join(artifactDirectory, "paid-operations.jsonl") }
}

async function readRecords(journalPath) {
  try {
    const text = await readFile(journalPath, "utf8")
    return text.split("\n").filter(Boolean).map(line => JSON.parse(line))
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") return []
    throw error
  }
}

function getUniqueOperations(records) {
  const latestByKey = new Map()
  for (const record of records) latestByKey.set(record.operationKey, record)
  return [...latestByKey.values()]
}

export function createPaidBudgetManager(environment = process.env) {
  const runId = environment.E2E_RUN_ID
  if (!runId) throw new Error("Provider operation tracking requires E2E_RUN_ID")
  const { artifactDirectory, journalPath } = getJournalPath(environment)

  async function append(record) {
    await mkdir(artifactDirectory, { recursive: true })
    await appendFile(journalPath, `${JSON.stringify(redact(record))}\n`)
    return record
  }

  async function reserve(reservation) {
    if (!reservation || typeof reservation.operationKey !== "string" || !reservation.operationKey.trim()
      || typeof reservation.provider !== "string" || !reservation.provider.trim()
      || typeof reservation.capability !== "string" || !reservation.capability.trim()
      || !Number.isInteger(reservation.paidCallCount) || reservation.paidCallCount <= 0) {
      throw new Error("Provider operation needs an operation key, provider, capability, and positive call count")
    }

    const records = await readRecords(journalPath)
    if (records.some(record => record.operationKey === reservation.operationKey && record.kind === "provider-operation-started")) {
      return { allowed: false, reason: "operation_key_already_recorded", operationKey: reservation.operationKey }
    }

    const record = {
      kind: "provider-operation-started",
      at: new Date().toISOString(),
      runId,
      operationKey: reservation.operationKey,
      provider: reservation.provider,
      capability: reservation.capability,
      plannedCallCount: reservation.paidCallCount,
      estimatedCostUsd: null,
      actualCostUsd: null,
      status: "started",
    }
    await append(record)
    return { allowed: true, ...record }
  }

  async function settle(result) {
    if (!result || typeof result.operationKey !== "string"
      || !["completed", "failed", "unknown"].includes(result.status)) {
      throw new Error("Provider operation result needs its operation key and a final status")
    }

    const records = await readRecords(journalPath)
    const started = records.find(record => record.operationKey === result.operationKey && record.kind === "provider-operation-started")
    if (!started) throw new Error("Provider operation has no matching started record")

    return append({
      kind: "provider-operation-finished",
      at: new Date().toISOString(),
      runId,
      operationKey: result.operationKey,
      provider: started.provider,
      capability: started.capability,
      plannedCallCount: started.plannedCallCount,
      estimatedCostUsd: null,
      actualCostUsd: null,
      status: result.status,
      providerResourceId: result.providerResourceId ?? null,
      details: redact(result.details ?? {}),
    })
  }

  async function snapshot() {
    const records = getUniqueOperations(await readRecords(journalPath))
    return records
  }

  return { reserve, settle, snapshot }
}

export async function readPaidOperationLedger(environment = process.env) {
  const { journalPath } = getJournalPath(environment)
  return getUniqueOperations(await readRecords(journalPath))
}

export async function writePaidOperationSnapshot(environment = process.env) {
  const runId = environment.E2E_RUN_ID ?? null
  const { artifactDirectory } = getJournalPath(environment)
  try {
    const records = await readPaidOperationLedger(environment)
    await mkdir(artifactDirectory, { recursive: true })
    await writeFile(path.join(artifactDirectory, "paid-operations.json"), `${JSON.stringify({
      status: "ready",
      runId,
      generatedAt: new Date().toISOString(),
      records: redact(records),
    }, null, 2)}\n`)
    return { status: "ready", count: records.length }
  } catch (error) {
    await mkdir(artifactDirectory, { recursive: true })
    await writeFile(path.join(artifactDirectory, "paid-operations.json"), `${JSON.stringify({
      status: "unavailable",
      runId,
      detail: error instanceof Error ? error.message.slice(0, 300) : String(error).slice(0, 300),
      records: [],
    }, null, 2)}\n`)
    return { status: "unavailable", count: 0, detail: error instanceof Error ? error.message.slice(0, 300) : String(error).slice(0, 300) }
  }
}
