"use client"

import { useEffect, useState } from "react"
import { AnimatePresence, animate, motion } from "framer-motion"

import { IBuyingFlowStats } from "@/ts/interfaces/IBuyingFlowStats"
import { selectDBBuyingFlowStatsAction } from "../actions/selectDBBuyingFlowStatsAction"

interface BuyingFlowProps {
  year: number
  month: number
}

interface BuyingFlowStage {
  visitors: number
}

export function getBuyingFlowLeaks(stages: BuyingFlowStage[]): (number | null)[] {
  return stages.slice(1).map((stage, index) => {
    const previousVisitors = stages[index].visitors
    if (previousVisitors === 0 || stage.visitors === 0) return null
    return Math.max(0, (previousVisitors - stage.visitors) / previousVisitors)
  })
}

export function getLargestLeakIndex(leaks: (number | null)[]): number {
  let largestLeakIndex = -1
  let largestLeak = 0

  leaks.forEach((leak, index) => {
    if (leak !== null && leak > largestLeak) {
      largestLeak = leak
      largestLeakIndex = index
    }
  })

  return largestLeakIndex
}

function AnimatedNumber({ value }: { value: number }) {
  const [displayValue, setDisplayValue] = useState(0)

  useEffect(() => {
    const numberAnimation = animate(0, value, {
      duration: 0.55,
      ease: "easeOut",
      onUpdate: latestValue => setDisplayValue(Math.round(latestValue)),
    })
    return () => numberAnimation.stop()
  }, [value])

  return <span>{displayValue.toLocaleString()}</span>
}

function formatCheckoutKind(kind: string): string {
  return kind
    .split("_")
    .map(word => word[0].toUpperCase() + word.slice(1))
    .join(" ")
}

// http://localhost:6006/?path=/story/admin-admintools--utm-stats
export function BuyingFlow({ year, month }: BuyingFlowProps) {
  const [buyingFlowStats, setBuyingFlowStats] = useState<IBuyingFlowStats | null>(null)
  const [selectedSearchList, setSelectedSearchList] = useState<"misses" | "top">("misses")
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    let isCurrentSelection = true

    async function selectStats() {
      const selectDBBuyingFlowStatsActionResp = await selectDBBuyingFlowStatsAction({ year, month })
      if (!isCurrentSelection) return
      if (typeof selectDBBuyingFlowStatsActionResp === "string") {
        setErrorMessage(selectDBBuyingFlowStatsActionResp)
        setBuyingFlowStats(null)
        return
      }

      setErrorMessage(null)
      setBuyingFlowStats(selectDBBuyingFlowStatsActionResp)
    }

    void selectStats()
    return () => {
      isCurrentSelection = false
    }
  }, [year, month])

  const leaks = getBuyingFlowLeaks(buyingFlowStats?.stages ?? [])
  const largestLeakIndex = getLargestLeakIndex(leaks)
  const highestVisitorCount = Math.max(...(buyingFlowStats?.stages.map(stage => stage.visitors) ?? [0]), 1)
  const searchRows = selectedSearchList === "misses" ? buyingFlowStats?.searchMisses : buyingFlowStats?.topSearches

  return (
    <section
      className="my-6 rounded-xl border border-border-color bg-foreground p-4 shadow-lg mobile:my-8 mobile:p-6"
      data-cy="buying-flow-section">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-title mobile:text-2xl">Buying flow</h2>
        <p className="text-sm text-subTitle">Distinct visitors for the selected dashboard period</p>
      </div>

      {errorMessage ? (
        <p className="rounded-lg border border-danger/30 bg-danger/10 p-4 text-sm text-danger">{errorMessage}</p>
      ) : !buyingFlowStats ? (
        <p className="rounded-lg border border-border-color/40 bg-background/40 p-4 text-sm text-subTitle">
          Selecting buying-flow rows…
        </p>
      ) : buyingFlowStats.stages.every(stage => stage.visitors === 0) ? (
        <p className="rounded-lg border border-border-color/40 bg-background/40 p-4 text-sm text-subTitle">
          No buying-flow events yet — rows appear after the SQL in the commit body runs and visitors click.
        </p>
      ) : (
        <>
          <div className="overflow-x-auto pb-2">
            <div className="flex min-w-[760px] items-end gap-2">
              {buyingFlowStats.stages.map((stage, index) => (
                <div className="contents" key={stage.stage}>
                  <div
                    className="flex min-w-0 flex-1 flex-col items-center gap-2"
                    data-cy={`buying-flow-stage-${stage.stage}`}>
                    <div className="flex h-32 w-full items-end overflow-hidden rounded-lg border border-border-color/30 bg-background/50 p-1.5">
                      <motion.div
                        className="w-full rounded-md bg-gradient-to-t from-brand to-success"
                        initial={{ height: 0 }}
                        animate={{ height: `${stage.visitors === 0 ? 0 : Math.max(8, (stage.visitors / highestVisitorCount) * 100)}%` }}
                        transition={{ delay: index * 0.12, duration: 0.55, ease: "easeOut" }}
                      />
                    </div>
                    <p className="text-2xl font-bold text-title">
                      <AnimatedNumber value={stage.visitors} />
                    </p>
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-subTitle">{stage.label}</p>
                  </div>

                  {index < buyingFlowStats.stages.length - 1 && (
                    <motion.span
                      className={`mb-20 rounded-full border px-2 py-1 text-xs font-semibold ${
                        index === largestLeakIndex
                          ? "border-danger/50 bg-danger/15 text-danger"
                          : "border-border-color/40 bg-background/60 text-subTitle"
                      }`}
                      data-cy="buying-flow-leak"
                      animate={index === largestLeakIndex ? { scale: [1, 1.08, 1] } : { scale: 1 }}
                      transition={index === largestLeakIndex ? { duration: 1.4, repeat: Infinity } : undefined}>
                      {leaks[index] === null ? "—" : `-${Math.round((leaks[index] || 0) * 100)}%`}
                    </motion.span>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="mt-6 border-t border-border-color/30 pt-5">
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-[0.14em] text-subTitle">Checkout clicks</h3>
            <div className="grid gap-2 mobile:grid-cols-2 laptop:grid-cols-5">
              {buyingFlowStats.checkoutKinds.map((checkoutKind, index) => (
                <div
                  className={`flex items-center justify-between rounded-lg border px-3 py-2 ${
                    index === 0
                      ? "border-success/40 bg-success/10 text-title"
                      : "border-border-color/30 bg-background/40 text-subTitle"
                  }`}
                  key={checkoutKind.kind}>
                  <span className="text-xs font-medium">{formatCheckoutKind(checkoutKind.kind)}</span>
                  <span className="text-lg font-bold text-title">{checkoutKind.clicks}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-6 border-t border-border-color/30 pt-5">
            <div className="mb-4 flex flex-wrap gap-2">
              <button
                className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                  selectedSearchList === "misses"
                    ? "bg-brand text-foreground"
                    : "bg-background/60 text-subTitle hover:bg-active-color"
                }`}
                data-cy="buying-flow-toggle-misses"
                type="button"
                onClick={() => setSelectedSearchList("misses")}>
                Missed searches
              </button>
              <button
                className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                  selectedSearchList === "top"
                    ? "bg-brand text-foreground"
                    : "bg-background/60 text-subTitle hover:bg-active-color"
                }`}
                data-cy="buying-flow-toggle-top"
                type="button"
                onClick={() => setSelectedSearchList("top")}>
                Top 10 searches
              </button>
            </div>

            <AnimatePresence mode="wait">
              <motion.div
                key={selectedSearchList}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.18 }}>
                {searchRows?.length ? (
                  <div className="grid gap-2 mobile:grid-cols-2">
                    {searchRows.map(searchRow => (
                      <div
                        className="flex items-center justify-between rounded-lg border border-border-color/30 bg-background/40 px-3 py-2"
                        key={searchRow.query}>
                        <span className="truncate text-sm text-title">“{searchRow.query}”</span>
                        <span className="ml-3 shrink-0 text-sm font-semibold text-subTitle">×{searchRow.count}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="rounded-lg border border-border-color/30 bg-background/40 p-3 text-sm text-subTitle">
                    {selectedSearchList === "misses"
                      ? "Missed searches appear after a visitor searches and gets zero results."
                      : "Top searches appear after visitors use product search."}
                  </p>
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </>
      )}
    </section>
  )
}
