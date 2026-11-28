# Solana price chart UI

The checkout sidebar shows the TradingView Coinbase SOL/USD advanced chart when the buyer opens
“Other ways to pay”. `PaymentButtons/components/SolanaPriceChart.tsx` owns the card and
`PaymentButtons/hooks/useSolanaPriceChart.ts` creates the hosted widget. The quote is a market
reference, while the server creates the actual payment amount.

The card uses a deep navy surface (`#0b1020`), a violet border and glow, and a violet-to-emerald
header. A 300px-high wrapper keeps the chart inside the scrollable checkout sidebar on desktop;
the full-width card also fits the mobile layout. The chart uses TradingView's dark theme, a subtle
grid, hourly candles and the visitor's supported store language. A TradingView link remains available
below it if the widget does not appear. The chart needs TradingView's script and network access.
