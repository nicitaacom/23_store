import { appendFile, mkdir, writeFile } from "node:fs/promises"
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

function getRequiredSettings(environment) {
  const settings = {
    supabaseUrl: environment.NEXT_PUBLIC_SUPABASE_URL,
    serviceRoleKey: environment.SUPABASE_SERVICE_ROLE_KEY,
    runId: environment.E2E_RUN_ID,
    maxCostUsd: Number(environment.E2E_MAX_PROVIDER_COST_USD),
    maxPaidOperations: Number(environment.E2E_MAX_PAID_OPERATIONS),
  }
  if (!settings.supabaseUrl || !settings.serviceRoleKey || !settings.runId) {
    throw new Error("Paid-operation tracking requires Supabase service access and E2E_RUN_ID")
  }
  if (!Number.isFinite(settings.maxCostUsd) || settings.maxCostUsd <= 0
    || !Number.isInteger(settings.maxPaidOperations) || settings.maxPaidOperations <= 0) {
    throw new Error("Paid-operation tracking requires valid cost and call limits")
  }
  return settings
}

function validateReservation(reservation) {
  if (!reservation || typeof reservation.operationKey !== "string"
    || reservation.operationKey.length < 1 || reservation.operationKey.length > 200
    || typeof reservation.provider !== "string" || reservation.provider.length < 1
    || typeof reservation.capability !== "string" || reservation.capability.length < 1
    || !Number.isInteger(reservation.paidCallCount) || reservation.paidCallCount <= 0
    || !Number.isFinite(reservation.estimatedCostUsd) || reservation.estimatedCostUsd < 0) {
    throw new Error("Paid-operation reservation is missing a valid key, provider, capability, cost, or call count")
  }
}

export function createPaidBudgetManager(environment = process.env) {
  const settings = getRequiredSettings(environment)
  const artifactDirectory = path.resolve(repositoryRoot, environment.E2E_ARTIFACT_DIR ?? "artifacts/e2e")
  const endpoint = `${settings.supabaseUrl.replace(/\/$/, "")}/rest/v1/rpc`

  async function callLedgerFunction(functionName, payload) {
    const response = await fetch(`${endpoint}/${functionName}`, {
      method: "POST",
      headers: {
        apikey: settings.serviceRoleKey,
        authorization: `Bearer ${settings.serviceRoleKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(15000),
    })
    if (!response.ok) throw new Error(`Paid-operation ledger ${functionName} returned HTTP ${response.status}`)
    const result = await response.json()
    return Array.isArray(result) ? result[0] : result
  }

  async function appendLedgerEvidence(record) {
    await mkdir(artifactDirectory, { recursive: true })
    await appendFile(path.join(artifactDirectory, "paid-operations.jsonl"), `${JSON.stringify(redact(record))}\n`)
  }

  async function snapshot() {
    const records = await readPaidOperationLedger(environment)
    await writeFile(path.join(artifactDirectory, "paid-operations.json"), `${JSON.stringify({
      status: "ready",
      runId: settings.runId,
      generatedAt: new Date().toISOString(),
      records: redact(records),
    }, null, 2)}\n`)
    return records
  }

  async function reserve(reservation) {
    validateReservation(reservation)
    const result = await callLedgerFunction("reserve_23_e2e_paid_operation", {
      p_suite_name: "23-store",
      p_run_id: settings.runId,
      p_operation_key: reservation.operationKey,
      p_provider: reservation.provider,
      p_capability: reservation.capability,
      p_paid_call_count: reservation.paidCallCount,
      p_estimated_cost_usd: reservation.estimatedCostUsd,
      p_max_cost_usd: settings.maxCostUsd,
      p_max_paid_operations: settings.maxPaidOperations,
    })
    const record = {
      kind: "paid-operation-reservation",
      at: new Date().toISOString(),
      runId: settings.runId,
      ...reservation,
      ...result,
    }
    await appendLedgerEvidence(record)
    return record
  }

  async function settle(result) {
    if (!result || typeof result.operationKey !== "string"
      || !["completed", "failed", "unknown"].includes(result.status)) {
      throw new Error("Paid-operation result requires its reservation key and a valid final status")
    }
    if (result.actualCostUsd !== undefined && result.actualCostUsd !== null
      && (!Number.isFinite(result.actualCostUsd) || result.actualCostUsd < 0)) {
      throw new Error("Actual paid-operation cost must be a nonnegative number")
    }
    const settled = await callLedgerFunction("finish_23_e2e_paid_operation", {
      p_suite_name: "23-store",
      p_run_id: settings.runId,
      p_operation_key: result.operationKey,
      p_status: result.status,
      p_provider_resource_id: result.providerResourceId ?? null,
      p_actual_cost_usd: result.actualCostUsd ?? null,
      p_details: redact(result.details ?? {}),
    })
    const record = {
      kind: "paid-operation-result",
      at: new Date().toISOString(),
      runId: settings.runId,
      ...result,
      ...settled,
    }
    await appendLedgerEvidence(record)
    return record
  }

  return { reserve, settle, snapshot }
}

export async function readPaidOperationLedger(environment = process.env) {
  const supabaseUrl = environment.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = environment.SUPABASE_SERVICE_ROLE_KEY
  const runId = environment.E2E_RUN_ID
  if (!supabaseUrl || !serviceRoleKey || !runId) {
    throw new Error("Paid-operation history requires Supabase service access and E2E_RUN_ID")
  }

  const endpoint = new URL(`${supabaseUrl.replace(/\/$/, "")}/rest/v1/23_e2e_paid_operation_ledger`)
  endpoint.searchParams.set("suite_name", "eq.23-store")
  endpoint.searchParams.set("run_id", `eq.${runId}`)
  endpoint.searchParams.set("select", "id,operation_key,provider,capability,paid_call_count,estimated_cost_usd,actual_cost_usd,status,provider_resource_id,created_at,updated_at,details")
  endpoint.searchParams.set("order", "created_at.asc")

  const records = []
  for (let offset = 0; ; offset += 1000) {
    const response = await fetch(endpoint, {
      headers: {
        apikey: serviceRoleKey,
        authorization: `Bearer ${serviceRoleKey}`,
        Range: `${offset}-${offset + 999}`,
        "Range-Unit": "items",
      },
      signal: AbortSignal.timeout(15000),
    })
    if (!response.ok) throw new Error(`Paid-operation history returned HTTP ${response.status}`)
    const page = await response.json()
    if (!Array.isArray(page)) throw new Error("Paid-operation history returned an invalid response")
    records.push(...page)
    if (page.length < 1000) return records
  }
}

export async function writePaidOperationSnapshot(environment = process.env) {
  const runId = environment.E2E_RUN_ID ?? null
  const artifactDirectory = path.resolve(repositoryRoot, environment.E2E_ARTIFACT_DIR ?? "artifacts/e2e")
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
      detail: error.message.slice(0, 300),
      records: [],
    }, null, 2)}\n`)
    return { status: "unavailable", count: 0, detail: error.message.slice(0, 300) }
  }
}
