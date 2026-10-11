"use client"

import { useSetStorageUsage } from "../hooks/useSetStorageUsage"
import { r2Config } from "@/config/r2Config"
import { useStorageUsage } from "@/store/admin/useStorageUsage"
import type { TStorageMetric, TStorageUsage } from "@/ts/storage"

interface StorageUsageProps { roles: string[]; initialUsage?: TStorageUsage }
const LABELS: Record<string, string> = {
  applicationLimit: `Application upload limit (${r2Config.totalForAllUsersGB} GB)`,
  r2Files: "R2 files", r2Objects: "R2 object count", r2Allowance: "R2 included allowance",
  r2ClassA: "R2 Class A requests", r2ClassB: "R2 Class B requests", r2Bandwidth: "R2 reported downloads",
  supabaseDatabase: "Supabase database", supabaseFiles: "Supabase legacy files",
  // eslint-disable-next-line local-rules/no-banned-words -- Exact Supabase billing metric name.
  supabaseCachedEgress: "Supabase cached egress", supabaseUncachedEgress: "Supabase uncached egress",
}

function formatMetric(value: number | null, unit: TStorageMetric["unit"]): string {
  if (value === null) return "Unavailable"
  return unit === "bytes" ? `${(value / 1000 ** 3).toLocaleString("en", { maximumFractionDigits: 3 })} GB` : value.toLocaleString("en")
}

// http://localhost:6006/?path=/story/admin-storage-usage--available
export function StorageUsage({ roles, initialUsage }: StorageUsageProps) {
  if (!roles.includes("ADMIN")) return null
  return <StorageUsageContent initialUsage={initialUsage} />
}

function StorageUsageContent({ initialUsage }: Pick<StorageUsageProps, "initialUsage">) {
  const { isSkeleton, refetchStorageUsage } = useSetStorageUsage(!initialUsage)
  const { usage: observedUsage, localError } = useStorageUsage()
  const usage = initialUsage ?? observedUsage
  return (
    <section className="space-y-4" aria-label="Storage & usage" data-cy="storage-usage">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><h2 className="text-lg font-semibold text-title">Storage &amp; usage</h2>
          <p className="text-sm text-subTitle">New files: {usage?.provider ?? "Checking provider…"}. Values use decimal GB.</p></div>
        <button className="rounded border border-brand/40 px-3 py-2 text-sm text-title hover:bg-brand/10 disabled:opacity-50"
          type="button" disabled={isSkeleton} onClick={refetchStorageUsage}>{isSkeleton ? "Refreshing…" : "Refresh"}</button>
      </div>
      <p className="text-sm text-subTitle">Provider metrics refresh every five minutes. Included allowances describe billing. The separate {r2Config.totalForAllUsersGB} GB application limit blocks additional uploads, including ADMIN uploads.</p>
      {localError && <p className="rounded border border-red-500/40 p-3 text-sm text-red-400" role="alert">{localError}</p>}
      {!usage && isSkeleton ? <p role="status">Checking storage usage…</p> : !usage ? <p>No usage observations yet. Refresh to try again.</p> : (
        <div className="grid grid-cols-1 gap-3 tablet:grid-cols-2 laptop:grid-cols-3">
          {Object.entries(usage.metrics).map(([name, metric]) => {
            const ratio = metric.value !== null && metric.allowance ? metric.value / metric.allowance : 0
            return (
              <article className="min-w-0 space-y-2 rounded-lg border border-border-color/40 bg-background/40 p-4" key={name}>
                <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="text-sm font-semibold text-title">{LABELS[name] ?? name}</h3>
                  <span className="text-xs text-subTitle">{metric.status}</span></div>
                <p className="text-2xl font-semibold text-title">{formatMetric(metric.value, metric.unit)}</p>
                {metric.allowance !== undefined && <p className="text-xs text-subTitle">{name === "applicationLimit" ? "Upload capacity" : "Included / configured allowance"}: {formatMetric(metric.allowance ?? null, metric.unit)}</p>}
                {metric.remaining !== undefined && <p className="text-sm text-subTitle">{name === "applicationLimit" ? "Remaining capacity" : "Remaining included"}: {formatMetric(metric.remaining ?? null, metric.unit)} · Excess: {formatMetric(metric.excess ?? null, metric.unit)}</p>}
                {ratio >= r2Config.totalGBUsedWarnPercentage / 100 && <p className="text-sm text-warning" role="status">{name === "applicationLimit"
                  ? ratio >= 1 ? "Upload limit reached; additional uploads are blocked" : `At least ${r2Config.totalGBUsedWarnPercentage}% of upload capacity used`
                  : ratio >= 1 ? "Included allowance reached or exceeded" : `At least ${r2Config.totalGBUsedWarnPercentage}% of included allowance used`}</p>}
                <p className="break-words text-xs text-subTitle">{metric.scope}</p>
                <p className="text-xs text-subTitle">{metric.source} · {metric.observedAt ? new Date(metric.observedAt).toLocaleString("en") : "No observation"}</p>
                {metric.detail && <p className="text-xs text-subTitle">{metric.detail}</p>}
                {metric.link && <a className="text-sm text-brand underline" href={metric.link} target="_blank" rel="noreferrer">Provider usage dashboard</a>}
              </article>
            )
          })}
        </div>
      )}
    </section>
  )
}
