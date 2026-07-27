# AI UI Skill — Project Rules

## Stack

- **Framework**: Next.js + React
- **Styling**: Tailwind CSS only — pure utility classes inline on JSX elements
- **No exceptions**

---

## HARD PROHIBITIONS — Do these and the output is wrong

```
✗ Never create .ts / .js / .tsx files just to hold CSS class strings
✗ Never create a `styles.ts`, `classNames.ts`, `ui.ts`, or any constants file for Tailwind classes
✗ Never use `clsx()` or `cn()` just to store static class strings in variables
✗ Never touch globals.css unless explicitly asked to add a CSS variable or keyframe
✗ Never use md: lg: xl: sm: breakpoints — they are not defined in this project
✗ Never hardcode hex colors — use token utilities only
✗ Never use bg-zinc-* bg-gray-* text-zinc-* text-gray-* — use design tokens
✗ Never use rounded-full except avatars, status dots, or truly circular buttons
✗ Never animate width, height, top, left — only opacity and transform
✗ Never add drop-shadow or box-shadow for depth — use borders and surface contrast
✗ Never introduce new accent colors — only use defined tokens
✗ Never use inline styles
```

---

## Styling: Pure Tailwind, Inline Only

All styles go directly on JSX elements as className strings.

```tsx
// ✓ correct
<div className="flex items-center gap-2 px-3 py-1.5 rounded border border-border-color bg-background text-sm text-title">

// ✗ wrong — extracting to a variable is pointless overhead
const cardClass = "flex items-center ..."
<div className={cardClass}>

// ✗ wrong — never do this
// styles.ts → export const CARD = "flex items-center ..."
```

If a class string is long, break it across lines in the JSX — do not extract it.

---

## Breakpoints (custom — not Tailwind defaults)

```
mobile:   @media (min-width: 415px)
tablet:   @media (min-width: 768px)
laptop:   @media (min-width: 1024px)
desktop:  @media (min-width: 1440px)
```

Always use these. `sm:` `md:` `lg:` `xl:` do nothing in this project.

---

## Color Tokens (use exclusively)

```
background         → page background
foreground         → primary body text
foreground-accent  → emphasized text, hover
title              → headings
title-foreground   → text on title-colored surface
subTitle           → muted / secondary text
border-color       → all borders and dividers
icon-color         → icon fills
brand              → primary accent — use sparingly (< 10% of screen)
info / danger / warning / success / success-accent → semantic states
```

---

## Spacing & Density (project_ui_style rules)

This project is **compact and content-first**. Do not add breathing room for aesthetics.

```
Default gaps:    gap-0.5 gap-1 gap-2 gap-3
Default padding: p-1 p-1.5 p-2 p-3
Default radius:  rounded (4px) — never rounded-xl or rounded-2xl for small elements
Larger panels:   rounded-md max
```

Larger spacing (`gap-8`, `p-12`, `py-24`) is an **exception** — only for major page section breaks.

---

## Typography

```
font-primary   → Inter       → body, UI copy, labels, inputs
font-secondary → Proxima Nova → headings, display text
```

Scale:

```
text-xs   → 12px — labels, captions, metadata
text-sm   → 14px — secondary body, helper text
text-base → 16px — primary body
text-lg   → 18px — lead paragraphs
text-xl+  → subheadings and above
```

---

## Surface / Depth — No Shadows

Depth comes from surface contrast and borders, not shadows.

```tsx
// ✓ layer surfaces correctly
bg-background          → page base
bg-foreground/5        → cards, panels
bg-foreground/10       → hover, selected row
ring-1 ring-border-color → card outline on flat bg

// ✗ never
shadow-md shadow-lg drop-shadow-*
```

---

## Shared Primitives (reuse, don't reinvent)

These are inline Tailwind patterns — memorize and repeat them consistently:

```tsx
// Panel / card
<div className="rounded border border-border-color bg-foreground/5 p-2">

// Badge
<span className="inline-flex items-center gap-1 rounded border border-border-color
  bg-background/55 px-2 py-0.5 text-[11px] font-medium uppercase
  tracking-[0.16em] text-subTitle">

// Icon button
<button className="inline-flex h-8 w-8 items-center justify-center rounded
  border border-border-color/35 bg-background/55 text-icon-color
  transition-colors duration-150 hover:bg-foreground/50">

// Text input
<input className="h-8 w-full rounded border border-border-color/35 bg-background/70
  px-3 text-sm text-title outline-none transition-colors duration-150
  placeholder:text-subTitle/55 focus:border-brand/35 focus:bg-background">

// Textarea
<textarea className="w-full rounded border border-border-color/35 bg-background/70
  px-3 py-2 text-sm text-title outline-none transition-colors duration-150
  placeholder:text-subTitle/55 focus:border-brand/35 focus:bg-background">

// Empty state
<div className="rounded border border-border-color/35 bg-background/35
  px-4 py-5 text-center text-subTitle">

// Modal shell
<div className="rounded-lg border border-border-color/35 bg-foreground/95 shadow-compact">
```

---

## Animations (Framer Motion — when used)

```tsx
// Entrance
initial={{ opacity: 0, y: 8 }}
animate={{ opacity: 1, y: 0 }}
transition={{ duration: 0.2, ease: "easeOut" }}

// Stagger
staggerChildren: 0.05  // tight — this is a compact UI, not a marketing page

// Hover lift (cards only)
whileHover={{ y: -2 }}
transition={{ type: "spring", stiffness: 400, damping: 25 }}

// Button press
whileTap={{ scale: 0.97 }}
```

Animate **only** `opacity` and `transform`. Duration range: `0.1s–0.3s` for UI elements.

Always respect reduced motion:

```tsx
const reduced = useReducedMotion()
const transition = reduced ? { duration: 0 } : { duration: 0.2, ease: "easeOut" }
```

---

## Checklist Before Outputting Any UI

- [ ] All styles are inline Tailwind on JSX — no extracted class constants, no .ts style files
- [ ] globals.css was not touched (unless asked)
- [ ] Only token colors used — no hex, no zinc-_, no gray-_
- [ ] Only `mobile:` `tablet:` `laptop:` `desktop:` breakpoints used
- [ ] Spacing is compact — default gap-1/gap-2, p-1/p-2
- [ ] No box-shadow or drop-shadow for depth
- [ ] `brand` accent is sparse
- [ ] Only `opacity` and `transform` animated
- [ ] `prefers-reduced-motion` respected if Framer Motion is used
- [ ] No rounded-full except circular shapes
