## Halloween UI description

The Halloween theme is a graveyard palette and backdrop, ported from `14_portfolio` and scoped
to `data-theme="halloween"`. It is not a brown or orange recolour of the store's default palette
— it replaces the full token set.

## 0. Why this document exists

The store has one palette plus a light/dark switch. Halloween is a seasonal override that runs
for one calendar month (see `app/constants/themeMonths.ts`) and replaces every token, so a
visitor should recognize the season from a silhouette with all text hidden: purple frame, orange
action colour, bone text, deep aubergine negative space.

## 1. Where it lives in this repo

### 1.1 Files

| File                                                | Role                                                          |
| ---------------------------------------------------- | -------------------------------------------------------------- |
| `app/styles/theme-halloween.css`                    | token bridge (`:root[data-theme="halloween"]`) + scene styles |
| `app/components/SeasonalBackdrop.tsx`               | mounts `HalloweenScene` and `NewYearScene` behind the page     |
| `app/components/Halloween/HalloweenScene.tsx`       | full-page ambient backdrop: canvas fog, SVG graveyard, vignette |
| `app/utils/resolveSeasonalTheme.ts`                 | month number in, theme name out                               |
| `app/constants/themeMonths.ts`                      | which calendar months map to which theme                      |
| `app/hooks/ui/useSiteTheme.ts`                      | reads `data-theme` off `<html>` for components that need it   |
| `public/UI/halloween/skull.png`, `skull-venom.png`  | ornament images, not yet wired to a component                 |

### 1.2 Token bridge

Every value below is a re-declaration of a token this repo's default palette already defines, so
no component needs to know a seasonal theme exists.

| Store token          | Halloween value      |
| --------------------- | ---------------------- |
| `--brand`            | `25deg 100% 55%`      |
| `--background`       | `273deg 37% 4%`       |
| `--foreground`       | `268deg 24% 12%`      |
| `--foreground-accent`| `267deg 27% 20%`      |
| `--foreground-hover` | `267deg 27% 24%`      |
| `--title`             | `43deg 23% 88%`       |
| `--title-foreground` | `270deg 28% 7%`       |
| `--subTitle`         | `270deg 10% 70%`      |
| `--border-color`     | `269deg 20% 46%`      |
| `--icon-color`       | `43deg 23% 88%`       |
| `--modal-surface`    | `270deg 26% 9%`       |
| `--info`             | `264deg 62% 76%`      |
| `--warning`          | `36deg 100% 54%`      |
| `--danger`           | `0deg 100% 69%`       |
| `--success`          | `116deg 34% 58%`      |
| `--success-accent`   | `116deg 40% 46%`      |

`--halloween-room` (`#070509`) is a substance variable, read only by `.halloween-scene`.

---

## 2. Reference map

| Reference                                                | Strongest idea                                                                                | Store use                                                |
| -------------------------------------------------------- | --------------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| `public/UI/halloween/skull.png`                          | Skull ornament                                                                                 | Product card / modal header ornament (not wired yet)     |
| `public/UI/halloween/skull-venom.png`                    | Skull with venom-green glow                                                                    | Modal header ornament (not wired yet)                    |

---

## 3. Visual language

### 3.1 Palette

| Token role       | Direction                      |
| ---------------- | ------------------------------ |
| Room             | Almost-black aubergine         |
| Raised surface   | Muted violet                   |
| Deep inset       | Blue-black / purple-black      |
| Primary accent   | Jack-o'-lantern orange         |
| Secondary accent | Cemetery green                 |
| Spectral accent  | Cyan-violet ghost light        |
| Body text        | Desaturated bone               |
| Muted text       | Grey-lilac                     |
| Frame edge       | Cold grey bone or thorn purple |
| Error            | Blood red, used sparingly      |

Orange means action. Green means healthy/live. Purple holds the frame. Bone is structure and
text. No warm brown workshop material is used.

### 3.2 Shape

- Frames are irregular and slightly asymmetrical.
- Corners are clipped, pointed, winged, webbed, or interrupted by ornaments.
- Controls have a raised centre with a dark inset shadow and a pale upper rim.
- Content areas remain flat and dark for readability; ornament lives on the perimeter.

### 3.3 Depth

```text
GRAVEYARD
  └── THORN / STONE FRAME
        └── PURPLE INNER RIM
              └── DARK CRYPT CONTENT
                    └── OPTIONAL BONE OR WEB ORNAMENT
```

Three visual levels are normally enough.

### 3.4 Lighting

- The moon supplies cool ambient light from the upper right.
- Candles and pumpkins supply small warm pools near controls.
- Shadows fall down and slightly left, opposite the moon.
- Orange glow belongs to actions and pumpkins, not paragraph containers.

### 3.5 Surface vocabulary

| Name                | Meaning                                                |
| ------------------- | ------------------------------------------------------ |
| **Graveyard**       | Full-page environment: moon, fog, graves, fence, trees |
| **Crypt**           | Primary content panel with heavy dark inset            |
| **Thorn frame**     | Flexible outer frame with pointed vine silhouette      |
| **Spell slab**      | Primary or secondary button                            |
| **Coffin field**    | Text input, select, or calendar cell inset             |
| **Web corner**      | Lightweight corner decoration                          |
| **Pumpkin lamp**    | Warm action/status light                               |

---

## 4. How it turns on

```text
themeMonths.ts { halloween: [11] }
        │
        ▼
resolveSeasonalTheme(month) -> "halloween" | "default"
        │
        ▼
SeasonalThemeLifecycle  writes  document.documentElement.dataset.theme
        │
        ▼
:root[data-theme="halloween"]  (theme-halloween.css)  outranks .dark
        │
        ▼
SeasonalBackdrop -> HalloweenScene  (fixed, z-0, pointer-events:none)
```

---

## 5. Responsive rules

- Skulls never overlap text or interactive targets.
- Decorative frames use `pointer-events: none`.
- Controls retain a minimum 44px touch target even when their visible slab is smaller.
- Modals must still fit 320px-wide screens without horizontal scrolling.

---

## 6. Accessibility and performance

- Decorations are `aria-hidden`.
- Canvas has no semantic content.
- Every action remains a native button/link/input.
- Focus state uses a solid orange-plus-bone outline and is not glow-only.
- Body copy meets WCAG AA against the crypt content surface.
- Off-screen animation is stopped.

---

## 7. TODO — not ported yet

- **Per-component ornaments.** `skull.png` and `skull-venom.png` sit in `public/UI/halloween/`
  with no importer. A follow-up plan wires them onto a product card / modal header.
- **The random storm/grave event.** `HalloweenGraveEvent.tsx` in the portfolio (~600 lines,
  Canvas rain + SVG gravestone reveal) did not get ported. Decision against, in
  `plans/plan-17-seasonal-themes-halloween-new-year.md` §6: separate plan when Nikita wants it.
- **Seasonal audio.** The portfolio plays `/thunderstorm.mp3` and `/creepy-halloween-bells.mp3`
  during the storm event. Not ported — no storm event exists here yet to trigger it.

Reproduction steps to see the theme without waiting for November: temporarily add the current
month number to the `halloween` array in `app/constants/themeMonths.ts`, refresh, then take it
back out.
