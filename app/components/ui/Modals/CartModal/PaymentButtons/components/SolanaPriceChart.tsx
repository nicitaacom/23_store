"use client"

import { useCurrentLocale, useI18n } from "@/locales/client"
import { useSolanaPriceChart } from "../hooks/useSolanaPriceChart"

// http://localhost:6006/?path=/story/commerce-checkout--cart
export function SolanaPriceChart() {
  const t = useI18n()
  const locale = useCurrentLocale()
  const chartRef = useSolanaPriceChart(locale)

  return (
    <section className="overflow-hidden rounded-xl border border-violet-400/30 bg-[#0b1020] text-white shadow-[0_0_24px_rgba(139,92,246,0.12)]" aria-label={t("payment.solana_chart_title")}>
      <div className="flex items-center justify-between gap-2 bg-gradient-to-r from-violet-500/20 via-indigo-500/10 to-emerald-400/10 px-3 py-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-violet-200">Solana · SOL/USD</p>
          <p className="mt-1 text-sm font-medium text-white">{t("payment.solana_chart_title")}</p>
        </div>
        <span className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-emerald-300">USD</span>
      </div>
      <div className="h-[300px] w-full">
        <div className="tradingview-widget-container h-full w-full" ref={chartRef} />
      </div>
      <div className="space-y-1 border-t border-white/10 px-3 py-2 text-xs leading-relaxed text-slate-300">
        <p>{t("payment.solana_chart_note")}</p>
        <a className="text-violet-300 underline hover:text-violet-200" href="https://www.tradingview.com/symbols/SOLUSD/?exchange=COINBASE" target="_blank" rel="noopener noreferrer">TradingView ↗</a>
      </div>
    </section>
  )
}
