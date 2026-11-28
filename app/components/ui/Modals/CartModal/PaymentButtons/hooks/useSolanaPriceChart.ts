import { useEffect, useRef } from "react"

export function useSolanaPriceChart(locale: string) {
  const chartRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const chartContainer = chartRef.current
    if (!chartContainer) return

    const widget = document.createElement("div")
    widget.className = "tradingview-widget-container__widget h-full w-full"
    chartContainer.appendChild(widget)
    const script = document.createElement("script")
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js"
    script.async = true
    script.textContent = JSON.stringify({
      autosize: true,
      symbol: "COINBASE:SOLUSD",
      interval: "60",
      timezone: "Etc/UTC",
      theme: "dark",
      style: "1",
      locale: locale === "se" ? "sv" : locale,
      backgroundColor: "#0b1020",
      gridColor: "rgba(148, 163, 184, 0.08)",
      hide_side_toolbar: true,
      allow_symbol_change: false,
      calendar: false,
      support_host: "https://www.tradingview.com",
    })
    chartContainer.appendChild(script)
    return () => { chartContainer.replaceChildren() }
  }, [locale])

  return chartRef
}
