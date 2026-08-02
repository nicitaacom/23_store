# plan-17 — seasonal themes: halloween + new-year (port from 14_portfolio)

**Priority:** P2
**Recommended model · thinking:** Sonnet · low — every step below is a file copy or a paste of a block that is already written out here. No design work is left open.
**Status:** see `plans/plan-00-tracker.md` (the only place statuses live)
**Depends on:** —
**Source repo:** `/home/kali/Documents/GitHub/14_portfolio` (read-only — never edit anything there)

---

## 0. Why this exists

The store has one palette plus a light/dark switch. The portfolio already ships a finished seasonal
theme system with two of the four themes fully designed: halloween and new-year.

What is already proven in the source repo:

- `app/utils/resolveSeasonalTheme.ts:7` — month number in, theme name out, `"default"` when the month matches nothing or matches more than one theme.
- `app/components/SeasonalThemeLifecycle.tsx:12` — writes `document.documentElement.dataset.theme` on mount, at midnight, on tab focus and on `pageshow`.
- `app/hooks/useSiteTheme.ts:27` — `useSyncExternalStore` over a `MutationObserver` on `data-theme`, so a component re-renders when the theme flips.
- `app/styles/theme-halloween.css:1` and `app/styles/theme-new-year.css:1` — the two `:root[data-theme="…"]` token blocks with the finished palettes.
- `app/components/Halloween/HalloweenScene.tsx` (371 lines) and `app/components/NewYear/NewYearScene.tsx` (697 lines) — full-page ambient backdrops. Both are self-contained: their only imports are React, `framer-motion`, `gsap` and `useSiteTheme`, and every colour inside them is a literal hex. They read zero CSS variables.

What does NOT port, and why — read this before you start:

- The portfolio CSS is written against portfolio class names: `.plaque`, `.navbar-plate`, `.machine-panel`, `.workbench-board`, `.modal-scroll`, `.project-more-info-modal`. A grep for all six across `23_store/app` returns nothing. Copying the two CSS files whole would land ~4200 lines of selectors that match no element in this repo.
- So this plan copies the **token blocks** and the **scene blocks** only, and re-writes the tokens onto the names this repo already uses (`--background`, `--title`, `--subTitle`, …). Every value is spelled out below — you never pick a colour.
- The portfolio has a third theme, `crazy-mechanics`, and a `default` seasonal branch. Nikita wants **two themes only**. Leave both out.

---

## 1. File map

| # | File in 23_store | Action | Source in 14_portfolio |
| --- | --- | --- | --- |
| 1 | `package.json` | add `gsap` | portfolio already depends on it |
| 2 | `app/ts/types/TSiteTheme.ts` | create | `app/interfaces/SiteTheme.ts` |
| 3 | `app/constants/themeMonths.ts` | create | `app/consts/THEME_MONTHS.ts` |
| 4 | `app/utils/resolveSeasonalTheme.ts` | create | same path |
| 5 | `app/hooks/ui/useSiteTheme.ts` | create | `app/hooks/useSiteTheme.ts` |
| 6 | `app/components/SeasonalThemeLifecycle.tsx` | create | same path |
| 7 | `app/[locale]/layout.tsx` | edit | `app/layout.tsx` |
| 8 | `app/styles/theme-halloween.css` | create | `app/styles/theme-halloween.css` (tokens + scene block only) |
| 9 | `app/styles/theme-new-year.css` | create | `app/styles/theme-new-year.css` (tokens + scene block only) |
| 10 | `public/UI/halloween/*.png` | copy 2 files | `public/UI/halloween/` |
| 11 | `public/UI/new-year/*.png` | copy 5 files | `public/UI/new-year/` |
| 12 | `app/components/Halloween/HalloweenScene.tsx` | copy verbatim, 1 import line changes | same path |
| 13 | `app/components/NewYear/NewYearScene.tsx` | copy verbatim, 1 import line changes | same path |
| 14 | `app/components/SeasonalBackdrop.tsx` | create | `app/components/WorkbenchWall.tsx` (trimmed to 2 themes) |
| 15 | `app/components/Layout/Layout.tsx` | edit | — |
| 16 | `app/components/index.ts` | edit | — |
| 17 | `dev_readme-ui-halloween.md` | create | `dev_readme-ui-halloween.md` |
| 18 | `dev_readme-ui-new-year.md` | create | `dev_readme-ui-new-year.md` |
| 19 | `CLAUDE.md` | edit — 2 map rows | — |

---

## 2. Terminology

- **theme** — the value of `data-theme` on `<html>`. One of `default`, `halloween`, `new-year`.
- **default** — no seasonal theme. The store's own palette, including the light/dark switch, runs untouched.
- **token bridge** — a `:root[data-theme="…"]` block that re-declares the store's existing CSS variables with seasonal values. It is the whole visual swap for text, surfaces and buttons.
- **scene** — the full-page ambient backdrop component (graveyard for halloween, snowing window for new-year). Fixed, behind everything, `pointer-events: none`.
- **substance variable** — a named colour like `--halloween-room` or `--new-year-room`. Only the scene block reads these.

---

## 3. Before / after

```text
BEFORE
  <html class="dark">                       ← SwitchDarkMode toggles .dark / .light
    body   background-color: hsl(var(--background))
      main.bg-background                    ← opaque, covers the viewport
        {children}

AFTER (data-theme="default" — unchanged)
  <html class="dark">
    body   background-color: hsl(var(--background))
      main.bg-background
        {children}

AFTER (data-theme="halloween" or "new-year")
  <html class="dark" data-theme="halloween">   ← SeasonalThemeLifecycle writes this
    body   background-color: transparent       ← theme CSS opens the view
      SeasonalBackdrop  (fixed, z-0, pointer-events:none, aria-hidden)
        └── HalloweenScene   → canvas fog + SVG graveyard + vignette
        └── NewYearScene     → canvas snow + SVG window/room
      main  background-color: transparent, z-10
        {children}                             ← every colour now comes from the token bridge
```

Cascade, so you know why this lands without `!important`:

```text
.dark                         specificity 0,1,0   ← globals.css, inside @layer base
:root[data-theme="halloween"] specificity 0,2,0   ← theme CSS, unlayered → wins
```

A seasonal theme therefore replaces light AND dark. That is on purpose: the store shows one
seasonal look in October–November and December–January, and the dark switch keeps working the
moment the month leaves those ranges.

---

## 4. Steps

Do ONE step, then stop. Review phrase from Nikita: **"approved - continue"**.

### Step 1 — add gsap

```bash
pnpm add gsap
```

`framer-motion` is already a dependency (`package.json`), `gsap` is not. Both scenes import it.

Nothing else in this step.

**STOP — show Nikita the diff and wait for his review.**

---

### Step 2 — the theme engine (5 new files + layout mount)

**2.1 — create `app/ts/types/TSiteTheme.ts`**

```ts
export type TSiteTheme = "default" | "halloween" | "new-year"

export type TSeasonalTheme = Exclude<TSiteTheme, "default">

export type TCalendarMonth = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12

export type TThemeMonthSchedule = Readonly<Record<TSeasonalTheme, readonly TCalendarMonth[]>>
```

The `T` prefix is rule 5 of `eslint-rules/type-naming-prefix.js` — the portfolio names them
`SiteTheme` / `SeasonalTheme`, this repo needs `TSiteTheme` / `TSeasonalTheme`.

**2.2 — create `app/constants/themeMonths.ts`**

```ts
import type { TThemeMonthSchedule } from "@/ts/types/TSiteTheme"

export const THEME_MONTHS = {
  halloween: [10, 11],
  "new-year": [12, 1],
} as const satisfies TThemeMonthSchedule
```

**2.3 — create `app/utils/resolveSeasonalTheme.ts`**

```ts
import { THEME_MONTHS } from "@/constants/themeMonths"

import type { TSeasonalTheme, TSiteTheme, TThemeMonthSchedule } from "@/ts/types/TSiteTheme"

export const DEFAULT_THEME: TSiteTheme = "default"

export function resolveSeasonalTheme(month: number, schedule: TThemeMonthSchedule = THEME_MONTHS): TSiteTheme {
  if (!Number.isInteger(month) || month < 1 || month > 12) return DEFAULT_THEME

  const matchingThemes = (Object.entries(schedule) as [TSeasonalTheme, TThemeMonthSchedule[TSeasonalTheme]][]).filter(
    ([, months]) => months.some(configuredMonth => configuredMonth === month),
  )

  return matchingThemes.length === 1 ? matchingThemes[0][0] : DEFAULT_THEME
}
```

**2.4 — create `app/hooks/ui/useSiteTheme.ts`**

```ts
"use client"

import { useSyncExternalStore } from "react"

import type { TSiteTheme } from "@/ts/types/TSiteTheme"

const DEFAULT_SITE_THEME: TSiteTheme = "default"

function subscribeToThemeChange(onStoreChange: () => void) {
  const observer = new MutationObserver(onStoreChange)
  observer.observe(document.documentElement, {
    attributeFilter: ["data-theme"],
    attributes: true,
  })

  return () => observer.disconnect()
}

function getThemeSnapshot(): TSiteTheme {
  return (document.documentElement.dataset.theme as TSiteTheme | undefined) ?? DEFAULT_SITE_THEME
}

function getServerThemeSnapshot(): TSiteTheme {
  return DEFAULT_SITE_THEME
}

export function useSiteTheme() {
  return useSyncExternalStore(subscribeToThemeChange, getThemeSnapshot, getServerThemeSnapshot)
}
```

**2.5 — create `app/components/SeasonalThemeLifecycle.tsx`**

```tsx
"use client"

import { useEffect } from "react"

import { resolveSeasonalTheme } from "@/utils/resolveSeasonalTheme"

function syncThemeWithLocalMonth() {
  const localMonth = new Date().getMonth() + 1
  document.documentElement.dataset.theme = resolveSeasonalTheme(localMonth)
}

export function SeasonalThemeLifecycle() {
  useEffect(() => {
    let midnightTimer: ReturnType<typeof setTimeout>

    const scheduleNextMidnightSync = () => {
      const now = new Date()
      const nextMidnight = new Date(now)
      nextMidnight.setHours(24, 0, 0, 0)

      midnightTimer = setTimeout(() => {
        syncThemeWithLocalMonth()
        scheduleNextMidnightSync()
      }, nextMidnight.getTime() - now.getTime())
    }

    const syncWhenVisible = () => {
      if (document.visibilityState === "visible") syncThemeWithLocalMonth()
    }

    syncThemeWithLocalMonth()
    scheduleNextMidnightSync()
    document.addEventListener("visibilitychange", syncWhenVisible)
    window.addEventListener("pageshow", syncThemeWithLocalMonth)

    return () => {
      clearTimeout(midnightTimer)
      document.removeEventListener("visibilitychange", syncWhenVisible)
      window.removeEventListener("pageshow", syncThemeWithLocalMonth)
    }
  }, [])

  return null
}
```

**2.6 — edit `app/[locale]/layout.tsx`**

Add the import beside the other component imports (line 10 area):

```tsx
import { SeasonalThemeLifecycle } from "@/components/SeasonalThemeLifecycle"
```

Add `data-theme="default"` and `suppressHydrationWarning` to the `<html>` tag at line 61, and mount
the lifecycle as the first child of `<body>`:

```tsx
    <html className={darkMode ?? "dark"} lang={locale} data-theme="default" suppressHydrationWarning>
      <body>
        <SeasonalThemeLifecycle />
        <I18nProviderClient locale={locale}>
```

`data-theme="default"` on the server and `suppressHydrationWarning` together keep the first paint
steady: the server has no visitor month, the effect writes the real one on mount.

**Verify:** `npx tsc --noEmit` passes, `pnpm lint` passes. In the browser console,
`document.documentElement.dataset.theme` reads `"default"` in August and `"halloween"` in October.
To check without waiting for October, temporarily add `8` to the `halloween` array in
`app/constants/themeMonths.ts`, refresh the page, then take it back out.

**STOP — show Nikita the diff and wait for his review.**

---

### Step 3 — the two token bridges

Nothing is looked up in this step. Paste both files exactly as written.

**3.1 — create `app/styles/theme-halloween.css`**

```css
/* Halloween — October and November. Palette ported from
   14_portfolio/app/styles/theme-halloween.css and re-written onto this repo's token names.
   Orange means action. Purple holds the frame. Bone is text. */

:root[data-theme="halloween"] {
  --brand: 25deg 100% 55%;
  --background: 273deg 37% 4%;
  --foreground: 268deg 24% 12%;
  --foreground-accent: 267deg 27% 20%;
  --foreground-hover: 267deg 27% 24%;
  --title: 43deg 23% 88%;
  --title-foreground: 270deg 28% 7%;
  --subTitle: 270deg 10% 70%;

  --border-color: 269deg 20% 46%;
  --icon-color: 43deg 23% 88%;

  --modal-surface: 270deg 26% 9%;

  --info: 264deg 62% 76%;
  --warning: 36deg 100% 54%;
  --danger: 0deg 100% 69%;
  --success: 116deg 34% 58%;
  --success-accent: 116deg 40% 46%;

  /* Read by .halloween-scene only */
  --halloween-room: #070509;
}

/* The scene sits behind the page, so the two opaque surfaces above it step aside */
:root[data-theme="halloween"] body,
:root[data-theme="halloween"] main {
  background-color: transparent;
}

/* ── Graveyard scene — verbatim from 14_portfolio/app/styles/theme-halloween.css:101-122,228-244 */

.halloween-scene {
  background: var(--halloween-room);
  inset: 0;
  isolation: isolate;
  overflow: clip;
  position: absolute;
}

.halloween-ambient-canvas {
  z-index: 2;
}

.halloween-graveyard-svg {
  overflow: hidden;
  z-index: 1;
}

.halloween-scene-vignette {
  background: linear-gradient(180deg, rgb(0 0 0 / 0.08), transparent 24%, rgb(0 0 0 / 0.18)),
    radial-gradient(ellipse at center, transparent 36%, rgb(0 0 0 / 0.74) 100%);
  z-index: 3;
}

.halloween-scene-bat {
  opacity: 0.72;
  will-change: transform;
}

.halloween-tree {
  filter: drop-shadow(0 18px 20px rgb(0 0 0 / 0.72));
}

.halloween-graves {
  filter: drop-shadow(0 11px 8px rgb(0 0 0 / 0.72));
}

.halloween-candles,
.halloween-scene-pumpkin {
  filter: drop-shadow(0 0 13px rgb(255 120 25 / 0.22));
}
```

**3.2 — create `app/styles/theme-new-year.css`**

```css
/* New Year — December and January. Palette ported from
   14_portfolio/app/styles/theme-new-year.css and re-written onto this repo's token names.
   Cold blue night outside, warm pine room inside. Crimson is the action colour. */

:root[data-theme="new-year"] {
  --brand: 354deg 78% 48%;
  --background: 164deg 46% 4%;
  --foreground: 162deg 40% 13%;
  --foreground-accent: 162deg 30% 18%;
  --foreground-hover: 162deg 30% 22%;
  --title: 40deg 30% 96%;
  --title-foreground: 162deg 54% 8%;
  --subTitle: 150deg 12% 74%;

  --border-color: 154deg 14% 58%;
  --icon-color: 40deg 30% 96%;

  /* Midnight-blue glass, sampled from #0f1e30 */
  --modal-surface: 213deg 52% 12%;

  --info: 196deg 46% 70%;
  --warning: 38deg 94% 66%;
  --danger: 354deg 86% 76%;
  --success: 150deg 48% 58%;
  --success-accent: 150deg 52% 46%;

  /* Read by .new-year-scene only */
  --new-year-room: #0f1e30;
}

:root[data-theme="new-year"] body,
:root[data-theme="new-year"] main {
  background-color: transparent;
}

/* ── Window scene — verbatim from 14_portfolio/app/styles/theme-new-year.css:168-195 */

.new-year-scene {
  background: var(--new-year-room);
  inset: 0;
  isolation: isolate;
  overflow: clip;
  position: absolute;
}

.new-year-interior-svg {
  overflow: hidden;
  z-index: 1;
}

/* NewYearScene measures this circle itself to start a bauble swing, so the swing does not wait
   for the pointer event to reach the element */
.new-year-scene-bauble-hit {
  cursor: pointer;
  pointer-events: auto;
}

/* Snow falls in front of the room, so the canvas sits over the SVG */
.new-year-snow-canvas {
  z-index: 2;
}
```

**3.3 — edit `app/[locale]/layout.tsx`** — add the two imports directly under line 1:

```tsx
import "../globals.css"
import "../styles/theme-halloween.css"
import "../styles/theme-new-year.css"
```

Order matters. Both files must come after `globals.css` in the import list, so the seasonal block
wins over the `@layer base` `:root` and `.dark` blocks.

**Verify:** in the browser console run
`document.documentElement.dataset.theme = "halloween"`, then `"new-year"`, then `"default"`.
Text, buttons, cards and modals repaint in each palette and go back to normal on `"default"`.

**STOP — show Nikita the diff and wait for his review.**

---

### Step 4 — the seven images

Only files that the shipped CSS or a shipped component points at. The portfolio's
`public/UI/halloween/halloween-1..5` and `public/UI/new-year/references/` are design specimens for
the docs — they stay in the portfolio.

```bash
mkdir -p /home/kali/Documents/GitHub/23_store/public/UI/halloween
mkdir -p /home/kali/Documents/GitHub/23_store/public/UI/new-year

cp /home/kali/Documents/GitHub/14_portfolio/public/UI/halloween/skull.png \
   /home/kali/Documents/GitHub/14_portfolio/public/UI/halloween/skull-venom.png \
   /home/kali/Documents/GitHub/23_store/public/UI/halloween/

cp /home/kali/Documents/GitHub/14_portfolio/public/UI/new-year/mandarine-4.png \
   /home/kali/Documents/GitHub/14_portfolio/public/UI/new-year/mandarine-slice.png \
   /home/kali/Documents/GitHub/14_portfolio/public/UI/new-year/new-year-socks.png \
   /home/kali/Documents/GitHub/14_portfolio/public/UI/new-year/new-year-coffee.png \
   /home/kali/Documents/GitHub/14_portfolio/public/UI/new-year/new-year-gifts.png \
   /home/kali/Documents/GitHub/23_store/public/UI/new-year/
```

What each one is for, so a later step has a home for it:

| File | Used by |
| --- | --- |
| `skull.png` | halloween ornament on a product card |
| `skull-venom.png` | halloween ornament on a modal header |
| `mandarine-4.png`, `mandarine-slice.png` | new-year footer rail |
| `new-year-socks.png`, `new-year-coffee.png`, `new-year-gifts.png` | new-year still-life at modal edges |

Do NOT copy `public/UI/new-year/milka cinnamon.png` — the space in its name needs `%20` in every
`url()`, and nothing in this plan uses it.

**Verify:** `ls -R public/UI` lists exactly 7 files.

**STOP — show Nikita the diff and wait for his review.**

---

### Step 5 — the two scenes

**5.1 — copy both component files**

```bash
mkdir -p /home/kali/Documents/GitHub/23_store/app/components/Halloween
mkdir -p /home/kali/Documents/GitHub/23_store/app/components/NewYear

cp /home/kali/Documents/GitHub/14_portfolio/app/components/Halloween/HalloweenScene.tsx \
   /home/kali/Documents/GitHub/23_store/app/components/Halloween/

cp /home/kali/Documents/GitHub/14_portfolio/app/components/NewYear/NewYearScene.tsx \
   /home/kali/Documents/GitHub/23_store/app/components/NewYear/
```

**5.2 — one edit in each copied file.** Line 8 of both reads:

```tsx
import { useSiteTheme } from "@/hooks/useSiteTheme"
```

Change it to:

```tsx
import { useSiteTheme } from "@/hooks/ui/useSiteTheme"
```

That is the only change either file needs. Every colour inside them is a literal hex and they read
no CSS variable, so they render the same in this repo as in the portfolio.

**5.3 — create `app/components/SeasonalBackdrop.tsx`**

```tsx
"use client"

import { HalloweenScene } from "@/components/Halloween/HalloweenScene"
import { NewYearScene } from "@/components/NewYear/NewYearScene"

/* One fixed layer behind the whole page. Each scene returns null unless its own theme is on, so
   only one of them ever paints and the default theme paints nothing at all. */
export function SeasonalBackdrop() {
  return (
    <div className="pointer-events-none fixed inset-[0] z-0 overflow-hidden" aria-hidden="true">
      <HalloweenScene />
      <NewYearScene />
    </div>
  )
}
```

**5.4 — edit `app/components/index.ts`**

```ts
import Layout from "./Layout/Layout"
import { OfflineBanner } from "./OfflineBanner"
import { SeasonalBackdrop } from "./SeasonalBackdrop"
import { SwitchDarkMode } from "./SwitchDarkMode"
export { Layout, SwitchDarkMode, OfflineBanner, SeasonalBackdrop }
```

**5.5 — edit `app/components/Layout/Layout.tsx`**

Import it:

```tsx
import { SeasonalBackdrop } from "@/components/SeasonalBackdrop"
```

Wrap the return so the backdrop sits behind `main` and `main` stacks above it:

```tsx
  return (
    <>
      <SeasonalBackdrop />
      <main
        className="relative z-10 flex min-h-screen w-full flex-col overflow-x-clip
        bg-background text-title
        transition-colors duration-300">
        {children}
      </main>
    </>
  )
```

`bg-background` stays on the tag. Under a seasonal theme the rule from step 3
(`:root[data-theme="…"] main { background-color: transparent }`) outranks it at specificity 0,1,1
against 0,1,0, so the scene shows through. Under `default` nothing overrides it and the store looks
exactly as it does today.

**Verify:**

1. `npx tsc --noEmit` and `pnpm lint` pass.
2. Set `document.documentElement.dataset.theme = "halloween"` in the console — fog, a graveyard
   silhouette and a vignette paint behind the page, and every button on the page still clicks.
3. Same with `"new-year"` — snow falls in front of a lit window.
4. Set it back to `"default"` — both scenes unmount, `document.querySelectorAll(".halloween-scene, .new-year-scene").length` reads `0`.
5. `body.scrollWidth === document.documentElement.clientWidth` at 390px, 768px, 1440px.
6. Console has no hydration warning and no animation cleanup error.

**STOP — show Nikita the diff and wait for his review.**

---

### Step 6 — documentation

**6.1** — copy both design docs across and trim them to what this repo actually ships:

```bash
cp /home/kali/Documents/GitHub/14_portfolio/dev_readme-ui-halloween.md \
   /home/kali/Documents/GitHub/14_portfolio/dev_readme-ui-new-year.md \
   /home/kali/Documents/GitHub/23_store/
```

Then in each copied file:

- Delete every section that names a portfolio-only surface: project cards, project modal, appointment/booking, the jazz player, the film strip, the fireworks and grave events, and the whole "hard separation from Crazy Mechanics" table. None of it exists here.
- Keep: the palette table, the shape/depth/lighting rules, the surface vocabulary, the responsive rules and the accessibility rules.
- Fix every `public/UI/...` path so it points at the 7 files that step 4 copied.
- Add a §1.1 block listing the real file paths in THIS repo: `app/styles/theme-halloween.css`, `app/styles/theme-new-year.css`, `app/components/SeasonalBackdrop.tsx`, `app/components/Halloween/HalloweenScene.tsx`, `app/components/NewYear/NewYearScene.tsx`.
- Add a §1.2 block with the token bridge table (store token name → seasonal value), copied out of step 3.
- Add a §3 ASCII block showing `themeMonths.ts → resolveSeasonalTheme → data-theme → CSS + scene`.
- Add a §4 TODO listing what is NOT ported yet: per-component ornaments (the 7 images sit in `public/` with no importer until then), the storm/fireworks events, and the seasonal audio.

**6.2 — edit `CLAUDE.md`** — add two rows to the dev_readme map table, in the same format as the rows around them:

| Halloween theme | [dev_readme-ui-halloween.md](dev_readme-ui-halloween.md) | Halloween palette, graveyard scene, October–November schedule |
| New Year theme | [dev_readme-ui-new-year.md](dev_readme-ui-new-year.md) | New Year palette, snowing-window scene, December–January schedule |

**STOP — show Nikita the diff and wait for his review.**

---

## 5. Code patterns to follow

Read these BEFORE writing any line, and check the diff against them before saying done:

- `dev_readme-code-patterns.md` — all 15 rules, including the banned-words list.
- `good-bad-examples.md`.
- `app/components/dev_readme.md` — shared component notes.
- `app/hooks/ui/dev_readme.md` — UI hook usage.
- `app/ts/dev_readme.md` — shared types.
- `app/utils/dev_readme.md` — when a file belongs in `utils`.
- `app/constant/dev_readme.md` — when NOT to use a constants folder.

Repo rules this plan already accounts for, so do not "fix" them back:

- Exported types get a `T` / `I` prefix (`eslint-rules/type-naming-prefix.js`) — that is why the portfolio's `SiteTheme` becomes `TSiteTheme`.
- Hooks live one per file under `app/hooks/ui/`, and a hook that is not a zustand store keeps the `useSomething` name (`eslint-rules/hook-naming-convention.js`).
- Absolute imports use the `@/*` → `./app/*` alias from `tsconfig.json`.

---

## 6. Decisions made (do not re-open)

- **Two themes only.** `crazy-mechanics` and the portfolio's seasonal `default` backdrop are out. `default` here means "the store's normal palette", nothing more.
- **AGAINST copying the two CSS files whole.** 4200 lines, and the selectors under the token block target `.plaque` / `.navbar-plate` / `.workbench-board` / `.project-more-info-modal`, none of which exist in this repo. Tokens plus the scene block are the parts that do something.
- **AGAINST porting the storm, the fireworks and the audio in this plan.** They are ~1700 more lines across `HalloweenGraveEvent.tsx`, `NewYearFireworksEvent.tsx` and `NewYearJazzPlayer.tsx`, plus 4 MP3 files, and the jazz player comes with embed terms that keep it visible on screen. Separate plan when Nikita wants it.
- **AGAINST `next/image` for the seasonal cutouts** when a later plan wires them. The portfolio measured the optimiser skipping 3 of 6 fixed decorative images inside skewed clipped panels; a direct tag with an eslint-disable and the reason above it is the shipped answer there.
- **Halloween runs October and November**, new-year December and January. The portfolio has halloween on November only. October is the shopping month for a store, so `themeMonths.ts` gets `[10, 11]`. One line to change if Nikita wants otherwise.
- **A seasonal theme replaces light and dark both.** `:root[data-theme]` outranks `.dark`. The switch keeps working the rest of the year.

---

## 7. Open for Nikita

- Step 4 copies 7 images that no component points at until a follow-up plan adds the ornaments. Say the word and they move to that plan instead.
- The scene components are 371 and 697 lines of portfolio geometry, tuned against a portfolio layout where the navbar takes the top ~280px. This store's navbar is a different height, so the graveyard ridge and the window head may sit at the wrong altitude. Step 5's screenshot check is where that shows up.

---

➡️ **Next plan:** none yet. The follow-up worth writing is `plan-18-seasonal-ornaments.md` — wire the 7 images onto navbar, product card, footer and modal edges.
