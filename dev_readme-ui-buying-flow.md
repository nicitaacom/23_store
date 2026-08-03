# 📊🎨 Buying-flow UI

## 🎯🧾 0. Why this exists

`/stats` needs one compact view of where visitors stop before checkout.

## 👀📁 1. How it looks and where data lives

```text
Buying flow
  Visited  -20%  Viewed  -75%  Added  -25%  Cart  -33%  Checkout
  100             80             20            15          10

Checkout clicks
  Request Better Prices 3 | Stripe 2 | PayPal 0 | MetaMask 1 | Solana 0

[Missed searches] [Top 10 searches]
  "winter boots" ×4
```

- Component: `app/[locale]/(site)/stats/components/BuyingFlow.tsx`.
- Data: `IBuyingFlowStats` from `selectDBBuyingFlowStatsAction`.
- Placement: under the `/stats` metric cards.

## 🧩📖 2. Terminology

- **Stage bar:** distinct visitors at one buying stage.
- **Fall badge:** percentage decrease from the previous stage.
- **Largest fall:** highest valid percentage; it pulses with danger colors.
- **Missed searches:** default list where `results_count = 0`.

## 🎨🧱 3. Copy-paste style recipes

**Section card**

```text
my-6 rounded-xl border border-border-color bg-foreground p-4 shadow-lg mobile:my-8 mobile:p-6
```

**Title and subtitle**

```text
text-xl font-bold text-title mobile:text-2xl
text-sm text-subTitle
```

**Status and empty message**

```text
rounded-lg border border-border-color/40 bg-background/40 p-4 text-sm text-subTitle
rounded-lg border border-danger/30 bg-danger/10 p-4 text-sm text-danger
```

**Stage strip and bar**

```text
flex min-w-[760px] items-end gap-2
flex min-w-0 flex-1 flex-col items-center gap-2
flex h-32 w-full items-end overflow-hidden rounded-lg border border-border-color/30 bg-background/50 p-1.5
w-full rounded-md bg-gradient-to-t from-brand to-success
```

**Stage value and label**

```text
text-2xl font-bold text-title
text-xs font-semibold uppercase tracking-[0.12em] text-subTitle
```

**Fall badges**

```text
mb-20 rounded-full border px-2 py-1 text-xs font-semibold
border-danger/50 bg-danger/15 text-danger
border-border-color/40 bg-background/60 text-subTitle
```

**Checkout cards**

```text
grid gap-2 mobile:grid-cols-2 laptop:grid-cols-5
flex items-center justify-between rounded-lg border px-3 py-2
border-success/40 bg-success/10 text-title
border-border-color/30 bg-background/40 text-subTitle
```

**Search toggles**

```text
rounded-full px-3 py-1.5 text-sm font-medium transition-colors
bg-brand text-foreground
bg-background/60 text-subTitle hover:bg-active-color
```

**Search rows**

```text
grid gap-2 mobile:grid-cols-2
flex items-center justify-between rounded-lg border border-border-color/30 bg-background/40 px-3 py-2
truncate text-sm text-title
ml-3 shrink-0 text-sm font-semibold text-subTitle
```

**Motion**

- Bars: delay `index * 0.12`, duration `0.55`, `easeOut`.
- Numbers: `0` to the visitor count in `0.55s`.
- Largest fall: scale `1 → 1.08 → 1`, duration `1.4s`, repeat.
- Search list: opacity plus `y`, duration `0.18s`.

## ✅🧪 4. Checks and decisions

**Reproduce**

1. Open `/stats` as an admin.
2. Confirm all five stage columns render.
3. Confirm the largest non-zero fall pulses red.
4. Confirm Missed searches is selected first.
5. Press Top 10 searches and confirm the list changes.
6. Pick another dashboard period and confirm the section updates.

**Decisions made against**

- No chart package for this section.
- No buyer-facing translations for the admin-only page.
- No separate stats route.
