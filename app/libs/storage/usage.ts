import { activeStorageProvider } from "./config"
import { selectStorageCapacity, STORAGE_CAPACITY_BYTES } from "./capacity"
import { storageProvider } from "./providers"
import { storageRedis } from "./state"
import { r2Config } from "@/config/r2Config"
import supabaseAdmin from "@/libs/supabase/supabaseAdmin"
import type { TStorageMetric, TStorageUsage } from "@/ts/storage"

const R2_SOURCE = "R2 bucket inventory"
const USAGE_REDIS_KEY = "storage:23:usage"
const USAGE_REFRESH_MS = 5 * 60 * 1000

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

export function summarizeR2Inventory(bytes: number, objects: number, standardOnly: boolean, now = new Date()): Record<string, TStorageMetric> {
  if (!Number.isSafeInteger(bytes) || bytes < 0 || !Number.isSafeInteger(objects) || objects < 0) {
    throw new Error("R2 inventory returned invalid measurements")
  }
  const observedAt = now.toISOString()
  const metrics: Record<string, TStorageMetric> = {
    r2Files: { value: bytes, unit: "bytes", source: R2_SOURCE, scope: "Configured R2 bucket, including temporary uploads", observedAt, status: "available" },
    r2Objects: { value: objects, unit: "objects", source: R2_SOURCE, scope: "Configured R2 bucket", observedAt, status: "available" },
    r2Allowance: standardOnly
      ? { value: bytes, unit: "bytes", source: R2_SOURCE, scope: "Configured bucket, current inventory", observedAt, status: "available",
        ...allowanceValues(bytes, 10 * 1000 ** 3),
        detail: "Compares this bucket's current bytes with the 10 GB included allowance. Other buckets are not included. Monthly billed GB-month depends on daily peaks; this is not an invoice." }
      : unavailable("bytes", R2_SOURCE, "Account included Standard allowance", "Confirm R2_ACCOUNT_STANDARD_ONLY after checking every account bucket. This inventory covers the configured bucket only."),
    r2ClassA: unavailable("requests", R2_SOURCE, "Account, month to date", "Request totals are not part of the bucket inventory"),
    r2ClassB: unavailable("requests", R2_SOURCE, "Account, month to date", "Request totals are not part of the bucket inventory"),
    r2Bandwidth: unavailable("bytes", R2_SOURCE, "Account, month to date", "Download totals are not part of the bucket inventory"),
  }
  return metrics
}

function unavailableR2Metrics(): Record<string, TStorageMetric> {
  return {
    r2Files: unavailable("bytes", R2_SOURCE, "Configured R2 bucket", "Bucket inventory is unavailable"),
    r2Objects: unavailable("objects", R2_SOURCE, "Configured R2 bucket", "Bucket inventory is unavailable"),
    r2Allowance: unavailable("bytes", R2_SOURCE, "Configured bucket", "Included allowance comparison is unavailable"),
    r2ClassA: unavailable("requests", R2_SOURCE, "Account, month to date", "Request totals are not part of the bucket inventory"),
    r2ClassB: unavailable("requests", R2_SOURCE, "Account, month to date", "Request totals are not part of the bucket inventory"),
    r2Bandwidth: unavailable("bytes", R2_SOURCE, "Account, month to date", "Download totals are not part of the bucket inventory"),
  }
}

export async function fetchR2Usage(): Promise<Record<string, TStorageMetric>> {
  if (activeStorageProvider() !== "r2") return unavailableR2Metrics()
  const provider = storageProvider("r2") as { inventoryTotals?: () => Promise<{ bytes: number; objects: number }> }
  if (typeof provider.inventoryTotals !== "function") return unavailableR2Metrics()
  const totals = await provider.inventoryTotals()
  return summarizeR2Inventory(totals.bytes, totals.objects, process.env.R2_ACCOUNT_STANDARD_ONLY === "true")
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
    r2Files: unavailable("bytes", R2_SOURCE, "Configured R2 bucket", "Bucket inventory is unavailable"),
    r2Objects: unavailable("objects", R2_SOURCE, "Configured R2 bucket", "Bucket inventory is unavailable"),
    r2Allowance: unavailable("bytes", R2_SOURCE, "Configured bucket", "Included allowance comparison is unavailable"),
    r2ClassA: unavailable("requests", R2_SOURCE, "Account, month to date", "Request totals are not part of the bucket inventory"),
    r2ClassB: unavailable("requests", R2_SOURCE, "Account, month to date", "Request totals are not part of the bucket inventory"),
    r2Bandwidth: unavailable("bytes", R2_SOURCE, "Account, month to date", "Download totals are not part of the bucket inventory"),
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
