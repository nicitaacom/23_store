"use client"

import { useSetStorageUsage } from "../hooks/useSetStorageUsage"
import { r2Config } from "@/config/r2Config"
import { useStorageUsage } from "@/store/admin/useStorageUsage"
import type { TStorageMetric, TStorageUsage } from "@/ts/storage"

interface StorageUsageProps { roles: string[]; initialUsage?: TStorageUsage }
const LABELS: Record<string, string> = {
  applicationLimit: `Upload limit (${r2Config.totalForAllUsersGB} GB)`,
  r2Files: "R2 files",
  r2Objects: "R2 objects",
  r2Allowance: "R2 included allowance",
  supabaseDatabase: "Database",
  supabaseFiles: "Legacy files",
}
const WARN_AT = r2Config.totalGBUsedWarnPercentage / 100

function formatMetric(value: number, unit: TStorageMetric["unit"]): string {
  if (unit === "bytes") return `${(value / 1000 ** 3).toLocaleString("en", { maximumFractionDigits: 3 })} GB`
  return value.toLocaleString("en")
}

function measuredEntries(metrics: Record<string, TStorageMetric>) {
  return Object.entries(metrics).filter((entry): entry is [string, TStorageMetric & { value: number }] => {
    return entry[1].status !== "unavailable" && entry[1].value !== null
  })
}

function fillClass(ratio: number) {
  if (ratio >= 1) return "bg-danger"
  if (ratio >= WARN_AT) return "bg-warning"
  return "bg-brand"
}

function Bar({ ratio, tone = "meter" }: { ratio: number; tone?: "meter" | "compare" }) {
  const width = ratio <= 0 ? "0%" : `${Math.min(100, Math.max(ratio * 100, 2))}%`
  return (
    <div className="h-2.5 overflow-hidden rounded-full bg-foreground/70">
      <div className={`h-full rounded-full ${tone === "compare" ? "bg-brand" : fillClass(ratio)}`} style={{ width }} />
    </div>
  )
}

function Ring({ ratio }: { ratio: number }) {
  const radius = 42
  const circumference = 2 * Math.PI * radius
  const shown = Math.max(0, Math.min(1, ratio))
  const dash = circumference * shown
  return (
    <svg className={`h-28 w-28 ${ratio >= 1 ? "text-danger" : ratio >= WARN_AT ? "text-warning" : "text-brand"}`} viewBox="0 0 120 120" aria-hidden>
      <circle cx="60" cy="60" r={radius} className="fill-none stroke-current opacity-20" strokeWidth="10" />
      {shown > 0 && (
        <circle
          cx="60"
          cy="60"
          r={radius}
          className="fill-none stroke-current"
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={`${dash} ${circumference - dash}`}
          transform="rotate(-90 60 60)"
        />
      )}
    </svg>
  )
}

function warningCopy(name: string, ratio: number) {
  if (ratio < WARN_AT) return null
  if (name === "applicationLimit") {
    return ratio >= 1 ? "Upload limit reached; additional uploads are blocked" : `At least ${r2Config.totalGBUsedWarnPercentage}% of upload capacity used`
  }
  return ratio >= 1 ? "Included allowance reached or exceeded" : `At least ${r2Config.totalGBUsedWarnPercentage}% of included allowance used`
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
  const measured = usage ? measuredEntries(usage.metrics) : []
  const featured = measured.find(([name]) => name === "applicationLimit")
  const rest = measured.filter(([name]) => name !== "applicationLimit")
  const scaleBytes = featured?.[1].allowance || featured?.[1].value || Math.max(1, ...rest.filter(([, metric]) => metric.unit === "bytes").map(([, metric]) => metric.value))

  return (
    <section className="space-y-4" aria-label="Storage & usage" data-cy="storage-usage">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-title">Storage &amp; usage</h2>
          <p className="text-sm text-subTitle">Decimal GB. Provider: {usage?.provider ?? "checking"}.</p>
        </div>
        <button
          className="rounded border border-brand/40 px-3 py-2 text-sm text-title hover:bg-brand/10 disabled:opacity-50"
          type="button"
          disabled={isSkeleton}
          onClick={refetchStorageUsage}
        >
          {isSkeleton ? "Refreshing…" : "Refresh"}
        </button>
      </div>
      {localError && <p className="rounded border border-danger/40 p-3 text-sm text-danger" role="alert">{localError}</p>}
      {!usage && isSkeleton ? <p role="status">Checking storage usage…</p> : !usage || measured.length === 0 ? (
        <p className="rounded-lg border border-border-color/40 bg-background/40 p-4 text-sm text-subTitle">No measurements yet. Refresh to try again.</p>
      ) : (
        <div className="space-y-3">
          {featured && <CapacityCard name={featured[0]} metric={featured[1]} />}
          {rest.length > 0 && (
            <div className="grid grid-cols-1 gap-3 tablet:grid-cols-2">
              {rest.map(([name, metric]) => {
                const allowanceRatio = metric.allowance ? metric.value / metric.allowance : null
                const diagramRatio = allowanceRatio ?? (metric.unit === "bytes" ? metric.value / scaleBytes : 0.35)
                const notice = allowanceRatio === null ? null : warningCopy(name, allowanceRatio)
                return (
                  <article className="min-w-0 space-y-3 rounded-lg border border-border-color/40 bg-background/40 p-4" key={name}>
                    <div className="flex items-end justify-between gap-3">
                      <h3 className="text-sm font-semibold text-title">{LABELS[name] ?? name}</h3>
                      <p className="text-xl font-semibold text-title">{formatMetric(metric.value, metric.unit)}</p>
                    </div>
                    <Bar ratio={diagramRatio} tone={allowanceRatio === null ? "compare" : "meter"} />
                    {metric.allowance ? (
                      <p className="text-xs text-subTitle">
                        {formatMetric(metric.remaining ?? 0, metric.unit)} left of {formatMetric(metric.allowance, metric.unit)}
                      </p>
                    ) : (
                      <p className="text-xs text-subTitle">{metric.scope}</p>
                    )}
                    {metric.status === "stale" && <p className="text-xs text-warning">Showing the last successful measurement</p>}
                    {notice && <p className="text-sm text-warning" role="status">{notice}</p>}
                  </article>
                )
              })}
            </div>
          )}
        </div>
      )}
    </section>
  )
}

function CapacityCard({ name, metric }: { name: string; metric: TStorageMetric & { value: number } }) {
  const allowance = metric.allowance ?? 0
  const ratio = allowance > 0 ? metric.value / allowance : 0
  const notice = warningCopy(name, ratio)
  return (
    <article className="grid min-w-0 items-center gap-4 rounded-lg border border-border-color/40 bg-background/40 p-4 tablet:grid-cols-[auto_1fr]">
      <div className="relative mx-auto grid h-28 w-28 place-items-center">
        <Ring ratio={ratio} />
        <p className="absolute text-center text-sm font-semibold text-title">{Math.round(Math.min(ratio, 9.99) * 100)}%</p>
      </div>
      <div className="min-w-0 space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <h3 className="text-sm font-semibold text-title">{LABELS[name] ?? name}</h3>
          <p className="text-2xl font-semibold text-title">{formatMetric(metric.value, metric.unit)}</p>
        </div>
        <Bar ratio={ratio} />
        <div className="grid grid-cols-2 gap-2 text-xs text-subTitle">
          <p>Left {formatMetric(metric.remaining ?? 0, metric.unit)}</p>
          <p>Over {formatMetric(metric.excess ?? 0, metric.unit)}</p>
        </div>
        {metric.status === "stale" && <p className="text-xs text-warning">Showing the last successful measurement</p>}
        {notice && <p className="text-sm text-warning" role="status">{notice}</p>}
      </div>
    </article>
  )
}
