import { activeStorageProvider } from "./config"
import { selectStorageCapacity, STORAGE_CAPACITY_BYTES } from "./capacity"
import { storageProvider } from "./providers"
import { storageRedis } from "./state"
import { r2Config } from "@/config/r2Config"
import supabaseAdmin from "@/libs/supabase/supabaseAdmin"
import type { TStorageMetric, TStorageUsage } from "@/ts/storage"

export type TR2StorageSample = { dimensions: { bucketName: string; datetime: string }; max: { payloadSize: number; metadataSize: number; objectCount: number } }
export type TR2OperationSample = { dimensions: { actionType: string }; sum: { requests: number } }
export type TR2Analytics = { storage: TR2StorageSample[]; operations: TR2OperationSample[]; bandwidth: { sum: { bytesDownload: number } }[] }
const USAGE_REDIS_KEY = "storage:23:usage"
const USAGE_REFRESH_MS = 5 * 60 * 1000
const SAMPLE_LIMIT = 10000
const CLASS_A = new Set(["listbuckets", "putbucket", "listobjects", "listobjectsv2", "putobject", "copyobject", "completemultipartupload", "createmultipartupload", "lifecyclestoragetiertransition", "listmultipartuploads", "uploadpart", "uploadpartcopy", "listparts", "putbucketencryption", "putbucketcors", "putbucketlifecycleconfiguration"])
const CLASS_B = new Set(["headbucket", "headobject", "getobject", "usagesummary", "getbucketencryption", "getbucketcors", "getbucketlifecycleconfiguration", "getbucketlocation"])
const FREE = new Set(["deleteobject", "deleteobjects", "deletebucket", "abortmultipartupload"])

export function allowanceValues(value: number, allowance: number) {
  return { allowance, remaining: Math.max(0, allowance - value), excess: Math.max(0, value - allowance) }
}

function unavailable(unit: TStorageMetric["unit"], source: string, scope: string, detail: string, link?: string): TStorageMetric {
  return { value: null, unit, source, scope, detail, observedAt: null, status: "unavailable", link }
}

function configuredAllowance(value: string | undefined): number | null {
  if (!value?.trim()) return null
  const number = Number(value)
  return Number.isFinite(number) && number >= 0 ? number : null
}

export function normalizeR2Usage(analytics: TR2Analytics, applicationBuckets: string[], now = new Date()): Record<string, TStorageMetric> {
  const latest = new Map<string, TR2StorageSample>()
  for (const sample of analytics.storage) {
    if (!sample.dimensions?.bucketName || !Number.isFinite(Date.parse(sample.dimensions.datetime)) ||
      [sample.max?.payloadSize, sample.max?.metadataSize, sample.max?.objectCount].some(value => !Number.isFinite(value) || value < 0))
      throw new Error("Cloudflare returned invalid storage samples")
    const previous = latest.get(sample.dimensions.bucketName)
    if (!previous || Date.parse(sample.dimensions.datetime) > Date.parse(previous.dimensions.datetime)) latest.set(sample.dimensions.bucketName, sample)
  }
  const source = "Cloudflare GraphQL"
  const observedAt = latest.size ? new Date(Math.min(...Array.from(latest.values(), sample => Date.parse(sample.dimensions.datetime)))).toISOString() : null
  const status = observedAt && now.getTime() - Date.parse(observedAt) <= 24 * 60 * 60 * 1000 ? "available" : "stale"
  const application = Array.from(latest.values()).filter(sample => applicationBuckets.includes(sample.dimensions.bucketName))
  const bytes = (samples: TR2StorageSample[]) => samples.reduce((total, sample) => total + sample.max.payloadSize + sample.max.metadataSize, 0)
  const storageComplete = analytics.storage.length < SAMPLE_LIMIT && applicationBuckets.every(bucket => latest.has(bucket))
  const metrics: Record<string, TStorageMetric> = {
    r2Files: storageComplete ? { value: bytes(application), unit: "bytes", source, scope: "Public application R2 bucket, including temporary uploads", observedAt, status }
      : unavailable("bytes", source, "Public application R2 bucket", "Missing bucket samples or truncated analytics; empty storage requires a provider sample"),
    r2Objects: storageComplete ? { value: application.reduce((total, sample) => total + sample.max.objectCount, 0), unit: "objects", source, scope: "Public application R2 bucket", observedAt, status }
      : unavailable("objects", source, "Public application R2 bucket", "Object count samples are unavailable"),
    r2Allowance: latest.size && analytics.storage.length < SAMPLE_LIMIT && process.env.R2_ACCOUNT_STANDARD_ONLY === "true"
      ? { value: bytes(Array.from(latest.values())), unit: "bytes", source, scope: "Account, current Standard storage snapshot", observedAt, status,
        ...allowanceValues(bytes(Array.from(latest.values())), 10 * 1000 ** 3),
        detail: "Snapshot comparison with the 10 GB-month included allowance. Monthly billed GB-month depends on daily peaks; this is a current-byte estimate, not an invoice or capacity limit." }
      : unavailable("bytes", source, "Account included Standard allowance", "Confirm R2_ACCOUNT_STANDARD_ONLY after checking all account buckets. Missing samples and other storage classes leave this comparison unavailable."),
  }
  let classA = 0
  let classB = 0
  let unknownOperations = false
  for (const operation of analytics.operations) {
    const action = operation.dimensions.actionType.replace(/^r2\./i, "").toLowerCase()
    if (!Number.isFinite(operation.sum.requests) || operation.sum.requests < 0) throw new Error("Invalid request metrics")
    if (CLASS_A.has(action)) classA += operation.sum.requests
    else if (CLASS_B.has(action)) classB += operation.sum.requests
    else if (!FREE.has(action)) unknownOperations = true
  }
  for (const [name, value, allowance] of [["r2ClassA", classA, 1_000_000], ["r2ClassB", classB, 10_000_000]] as const) {
    metrics[name] = unknownOperations || analytics.operations.length >= SAMPLE_LIMIT
      ? unavailable("requests", source, "Account, month to date", "Unknown operation classes or truncated analytics")
      : { value, unit: "requests", source, scope: "Account, month to date; reported operations", observedAt: now.toISOString(), status: "available",
        ...(process.env.R2_ACCOUNT_STANDARD_ONLY === "true" ? allowanceValues(value, allowance) : { allowance: null }),
        detail: "Standard request allowances apply only after all account storage classes are confirmed. Invoice rounding may differ." }
  }
  metrics.r2Bandwidth = { value: analytics.bandwidth.reduce((total, sample) => total + sample.sum.bytesDownload, 0),
    unit: "bytes", source, scope: "Account, month to date", observedAt: now.toISOString(), status: "available",
    detail: "Reported analytics exclude transfers below 100 KiB; this is not invoice-exact traffic." }
  if (!Number.isFinite(metrics.r2Bandwidth.value) || (metrics.r2Bandwidth.value ?? 0) < 0) throw new Error("Invalid bandwidth metrics")
  return metrics
}

// eslint-disable-next-line local-rules/sdk-method-naming -- This sends a request to the external Cloudflare analytics API.
export async function fetchR2Usage(): Promise<Record<string, TStorageMetric>> {
  if (!process.env.CLOUDFLARE_R2_ANALYTICS_TOKEN || !process.env.R2_ACCOUNT_ID) throw new Error("R2 analytics credentials are not configured")
  const now = new Date()
  const startDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString()
  const storageStart = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString()
  const response = await fetch("https://api.cloudflare.com/client/v4/graphql", {
    method: "POST", headers: { Authorization: `Bearer ${process.env.CLOUDFLARE_R2_ANALYTICS_TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query: `query StorageUsage($accountTag: string!, $startDate: Time!, $endDate: Time!, $storageStart: Time!) {
      viewer { accounts(filter: {accountTag: $accountTag}) {
        storage: r2StorageAdaptiveGroups(limit: 10000, filter: {datetime_geq: $storageStart, datetime_leq: $endDate}, orderBy: [datetime_DESC]) {
          max { payloadSize metadataSize objectCount } dimensions { bucketName datetime }
        }
        operations: r2OperationsAdaptiveGroups(limit: 10000, filter: {datetime_geq: $startDate, datetime_leq: $endDate}) {
          sum { requests } dimensions { actionType }
        }
        bandwidth: r2BandwidthUsageAdaptiveGroups(limit: 1, filter: {datetime_geq: $startDate, datetime_lt: $endDate}) { sum { bytesDownload } }
      }}
    }`, variables: { accountTag: process.env.R2_ACCOUNT_ID, startDate, endDate: now.toISOString(), storageStart } }),
    cache: "no-store", signal: AbortSignal.timeout(15000),
  })
  const analytics: { data?: { viewer?: { accounts?: TR2Analytics[] } }; errors?: { message: string }[] } = await response.json()
  const account = analytics.data?.viewer?.accounts?.[0]
  if (!response.ok || analytics.errors?.length || !account || !Array.isArray(account.storage) || !Array.isArray(account.operations) || !Array.isArray(account.bandwidth))
    throw new Error("Cloudflare analytics are unavailable; check the restricted token and dataset access")
  if (!process.env.R2_BUCKET) throw new Error("R2 application bucket is not configured")
  return normalizeR2Usage(account, [process.env.R2_BUCKET], now)
}

async function selectSupabaseUsage(): Promise<Record<string, TStorageMetric>> {
  const { data: sizes, error } = await supabaseAdmin.rpc("23_storage_usage")
  if (error || !sizes) throw new Error(error?.message ?? "Supabase usage query returned no metrics")
  const values = sizes as { databaseBytes: number; applicationStorageBytes: number }
  if (!Number.isFinite(values.databaseBytes) || !Number.isFinite(values.applicationStorageBytes)) throw new Error("Invalid Supabase size metrics")
  const databaseAllowance = configuredAllowance(process.env.SUPABASE_DATABASE_ALLOWANCE_BYTES)
  const storageAllowance = configuredAllowance(process.env.SUPABASE_STORAGE_ALLOWANCE_BYTES)
  return {
    supabaseDatabase: { value: values.databaseBytes, unit: "bytes", source: "Supabase restricted SQL function",
      scope: "Whole shared database, including other projects", observedAt: new Date().toISOString(), status: "available",
      allowance: databaseAllowance, ...(databaseAllowance === null ? {} : allowanceValues(values.databaseBytes, databaseAllowance)) },
    supabaseFiles: { value: values.applicationStorageBytes, unit: "bytes", source: "Supabase Storage metadata",
      scope: "Six application buckets; legacy files retained during migration", observedAt: new Date().toISOString(), status: "available",
      allowance: storageAllowance, detail: "The configured project allowance is shared; application files alone do not establish project remaining allowance." },
  }
}

export async function selectStorageUsage(): Promise<TStorageUsage> {
  const redis = storageRedis()
  const provider = activeStorageProvider()
  let previous: TStorageUsage | null = null
  try { previous = await redis.get<TStorageUsage>(USAGE_REDIS_KEY) } catch { /* Metrics stay available when Redis is unavailable. */ }
  if (previous?.provider === provider && Date.now() - Date.parse(previous.refreshedAt) < USAGE_REFRESH_MS) return previous
  const metrics: Record<string, TStorageMetric> = {
    applicationLimit: unavailable("bytes", "Provider object inventory and reserved uploads", "Active application's files, including temporary uploads", `The shared ${r2Config.totalForAllUsersGB} GB upload limit is enforced before signing; usage is unavailable`),
    r2Files: unavailable("bytes", "Cloudflare GraphQL", "Public application R2 bucket", "Analytics are unavailable"),
    r2Objects: unavailable("objects", "Cloudflare GraphQL", "Public application R2 bucket", "Analytics are unavailable"),
    r2Allowance: unavailable("bytes", "Cloudflare GraphQL", "Account", "Included allowance comparison is unavailable"),
    r2ClassA: unavailable("requests", "Cloudflare GraphQL", "Account, month to date", "Analytics are unavailable"),
    r2ClassB: unavailable("requests", "Cloudflare GraphQL", "Account, month to date", "Analytics are unavailable"),
    r2Bandwidth: unavailable("bytes", "Cloudflare GraphQL", "Account, month to date", "Analytics are unavailable"),
    supabaseDatabase: unavailable("bytes", "Supabase restricted SQL function", "Whole shared database", "Apply the restricted storage usage function"),
    supabaseFiles: unavailable("bytes", "Supabase Storage metadata", "Application buckets", "Storage metadata is unavailable"),
    // eslint-disable-next-line local-rules/no-banned-words -- Exact Supabase billing metric name.
    supabaseCachedEgress: unavailable("bytes", "Supabase provider dashboard", "Whole project, cached egress", "No reliable configured egress integration", "https://supabase.com/dashboard/project/_/settings/usage"),
    supabaseUncachedEgress: unavailable("bytes", "Supabase provider dashboard", "Whole project, uncached egress", "No reliable configured egress integration", "https://supabase.com/dashboard/project/_/settings/usage"),
  }
  const selectCapacity = async (): Promise<Record<string, TStorageMetric>> => ({
    applicationLimit: { value: await selectStorageCapacity(storageProvider(activeStorageProvider())), unit: "bytes",
      source: "Provider object inventory and reserved uploads", scope: "Active application's files, including temporary uploads",
      observedAt: new Date().toISOString(), status: "available", allowance: STORAGE_CAPACITY_BYTES,
      detail: `Hard ${r2Config.totalForAllUsersGB} GB upload limit, including ADMIN. Temporary files and outstanding reservations count against capacity; conservative reservations can count staged bytes twice. Separate from provider included allowances.` },
  })
  const sources = [fetchR2Usage, selectSupabaseUsage, selectCapacity]
  const responses = await Promise.allSettled(sources.map(source => source()))
  responses.forEach((response, index) => {
    if (response.status === "fulfilled") {
      Object.assign(metrics, response.value)
      if (index === 2) Object.assign(metrics.applicationLimit, allowanceValues(metrics.applicationLimit.value ?? 0, STORAGE_CAPACITY_BYTES))
      return
    }
    const sourceKeys = index === 0 ? ["r2Files", "r2Objects", "r2Allowance", "r2ClassA", "r2ClassB", "r2Bandwidth"]
      : index === 1 ? ["supabaseDatabase", "supabaseFiles"] : ["applicationLimit"]
    for (const key of sourceKeys) {
      if (key === "applicationLimit" && previous?.provider !== provider) continue
      const metric = previous?.metrics[key]
      if (metric?.value !== null && metric?.value !== undefined) metrics[key] = { ...metric, status: "stale", detail: "Provider refresh failed; showing the last successful observation" }
    }
  })
  const usage: TStorageUsage = { provider, refreshedAt: new Date().toISOString(), metrics }
  // Successful observations persist beyond five minutes so failed refreshes retain their values.
  try { await redis.set(USAGE_REDIS_KEY, usage) } catch { /* Display the fresh observations without Redis. */ }
  return usage
}
