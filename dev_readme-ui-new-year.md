## New Year UI description

The New Year theme is a cold blue night outside and a warm holiday room inside, ported from
`14_portfolio` and scoped to `data-theme="new-year"`. It is not a red-and-green recolour of the
store's default palette — it replaces the full token set.

## 0. Why this document exists

The store has one palette plus a light/dark switch. New Year is a seasonal override that runs
for two calendar months (see `app/constants/themeMonths.ts`) and replaces every token, so a
visitor should recognize the season from a silhouette with all text hidden: pine surfaces,
crimson action colour, warm-snow text, a cold blue-black exterior.

## 1. Where it lives in this repo

### 1.1 Files

| File                                                             | Role                                                            |
| ------------------------------------------------------------------ | ------------------------------------------------------------------ |
| `app/styles/theme-new-year.css`                                 | token bridge (`:root[data-theme="new-year"]`) + scene styles   |
| `app/components/SeasonalBackdrop.tsx`                            | mounts `HalloweenScene` and `NewYearScene` behind the page      |
| `app/components/NewYear/NewYearScene.tsx`                        | full-page ambient backdrop: canvas snow, SVG window/room       |
| `app/utils/resolveSeasonalTheme.ts`                              | month number in, theme name out                                 |
| `app/constants/themeMonths.ts`                                   | which calendar months map to which theme                        |
| `app/hooks/ui/useSiteTheme.ts`                                   | reads `data-theme` off `<html>` for components that need it     |
| `public/UI/new-year/mandarine-4.png`, `mandarine-slice.png`, `new-year-socks.png`, `new-year-coffee.png`, `new-year-gifts.png` | still-life cutouts, not yet wired to a component |

### 1.2 Token bridge

Every value below is a re-declaration of a token this repo's default palette already defines, so
no component needs to know a seasonal theme exists.

| Store token          | New Year value        |
| --------------------- | ------------------------ |
| `--brand`            | `354deg 78% 48%`        |
| `--background`       | `164deg 46% 4%`         |
| `--foreground`       | `162deg 40% 13%`        |
| `--foreground-accent`| `162deg 30% 18%`        |
| `--foreground-hover` | `162deg 30% 22%`        |
| `--title`             | `40deg 30% 96%`         |
| `--title-foreground` | `162deg 54% 8%`         |
| `--subTitle`         | `150deg 12% 74%`        |
| `--border-color`     | `154deg 14% 58%`        |
| `--icon-color`       | `40deg 30% 96%`         |
| `--modal-surface`    | `213deg 52% 12%`        |
| `--info`             | `196deg 46% 70%`        |
| `--warning`          | `38deg 94% 66%`         |
| `--danger`           | `354deg 86% 76%`        |
| `--success`          | `150deg 48% 58%`        |
| `--success-accent`   | `150deg 52% 46%`        |

`--new-year-room` (`#0f1e30`) is a substance variable, read only by `.new-year-scene`.

---

## 2. Reference map

| Reference                          | Strongest idea                     | Store use                                       |
| ------------------------------------ | ------------------------------------- | -------------------------------------------------- |
| `public/UI/new-year/mandarine-4.png`      | Whole mandarin                | Footer rail / still-life cutout (not wired yet) |
| `public/UI/new-year/mandarine-slice.png`  | Mandarin cross-section        | Footer rail / still-life cutout (not wired yet) |
| `public/UI/new-year/new-year-socks.png`   | Holiday sock cutout            | Modal-edge still-life (not wired yet)           |
| `public/UI/new-year/new-year-coffee.png`  | Hot drink cutout                | Modal-edge still-life (not wired yet)           |
| `public/UI/new-year/new-year-gifts.png`   | Gift-box cutout                 | Modal-edge still-life (not wired yet)           |

---

## 3. Visual language

### 3.1 Palette

| Role              | Value              | Note                                                |
| -------------------- | --------------------- | ------------------------------------------------------ |
| Room / exterior     | deep blue-black       | cold winter night, sampled `#0f1e30`                  |
| Raised surface      | deep pine              | the warm indoor material                              |
| Body text           | warm snow              | never pure white                                      |
| Action accent       | crimson                | a surface colour — buttons, progress fills, trim      |
| Amber                | candlelight glow only  | bokeh, candle flames, bulbs — never a surface fill    |

Cold blue belongs to the exterior, frosted panes and recessed controls. It does not replace pine
on the warm interior surfaces.

### 3.2 Shape

- Snow settles on top edges and ledges — it obeys gravity, never floats as a flat overlay.
- Raised surfaces get a soft snow lip on the top edge; a scalloped fur cuff on the bottom edge.
- Content areas stay flat and warm-lit for readability; snow and frost live on the perimeter.

### 3.3 Depth

```text
COLD NIGHT (exterior)
  └── FROSTED GLASS FRAME
        └── PINE INNER SURFACE
              └── WARM ROOM CONTENT
                    └── OPTIONAL STILL-LIFE ORNAMENT
```

### 3.4 Lighting

- The window supplies cool ambient light from outside.
- Candlelight supplies small warm pools near controls.
- Amber glow belongs to actions and candle ornaments, not paragraph containers.

### 3.5 Surface vocabulary

| Name                | Meaning                                                |
| ------------------- | ------------------------------------------------------ |
| **Night scene**     | Full-page environment: window, falling snow, room glow |
| **Pine surface**    | Primary content panel                                  |
| **Frosted glass**   | Inputs and recessed controls                           |
| **Crimson slab**    | Primary or secondary button                            |
| **Still-life**      | Mandarin / sock / coffee / gift cutout at a modal edge |

---

## 4. How it turns on

```text
themeMonths.ts { "new-year": [12, 1] }
        │
        ▼
resolveSeasonalTheme(month) -> "new-year" | "default"
        │
        ▼
SeasonalThemeLifecycle  writes  document.documentElement.dataset.theme
        │
        ▼
:root[data-theme="new-year"]  (theme-new-year.css)  outranks .dark
        │
        ▼
SeasonalBackdrop -> NewYearScene  (fixed, z-0, pointer-events:none)
```

---

## 5. Responsive rules

- Decorative frames use `pointer-events: none`.
- Controls retain a minimum 44px touch target even when their visible slab is smaller.
- Modals must still fit 320px-wide screens without horizontal scrolling.
- `body.scrollWidth === documentElement.clientWidth` at 390 / 768 / 1440.

---

## 6. Accessibility and performance

- Decorations are `aria-hidden`.
- Canvas has no semantic content.
- Every action remains a native button/link/input.
- Focus state uses a solid crimson-plus-snow outline and is not glow-only.
- Body copy meets WCAG AA against the pine content surface.
- Off-screen animation is stopped; snow canvas pauses under `prefers-reduced-motion` and while a
  modal is open.

---

## 7. TODO — not ported yet

- **Per-component still-life.** `mandarine-4.png`, `mandarine-slice.png`, `new-year-socks.png`,
  `new-year-coffee.png` and `new-year-gifts.png` sit in `public/UI/new-year/` with no importer.
  A follow-up plan wires them onto a footer rail / modal edges.
- **Fireworks event.** `NewYearFireworksEvent.tsx` in the portfolio (Canvas particles + GSAP
  flash) did not get ported. Decision against, in
  `plans/plan-17-seasonal-themes-halloween-new-year.md` §6: separate plan when Nikita wants it.
- **Seasonal audio / jazz player.** The portfolio embeds a lo-fi playlist player. Not ported —
  it comes with embed terms that keep it visible on screen; out of scope for this plan.

Reproduction steps to see the theme without waiting for December: temporarily add the current
month number to the `"new-year"` array in `app/constants/themeMonths.ts`, refresh, then take it
back out.
