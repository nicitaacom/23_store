# Project UI Style

## 0. Why this exists

The UI must feel like one coherent system. Because the site uses **flat vector illustrations**, every surface needs to match that soft, precise aesthetic — not a generic SaaS dashboard, not a landing page, not a shadowy card-heavy layout. This doc defines the defaults so AI and humans produce consistent output.

---

## 1. Philosophy

- **Compact and content-first.** Fit more on screen. Never add breathing room for aesthetics alone.
- **Flat vector feel.** Illustrations are clean and precise. UI must match: clean borders, soft blur, no heavy shadows.
- **One system.** Buttons, inputs, panels, badges, modals, empty states — all share the same density and token palette.

---

## 2. Spacing & Density

Default gaps and paddings are small. Larger values are exceptions only.

| Context | Value |
|---|---|
| Default gap | `gap-1` `gap-2` `gap-3` |
| Default padding | `p-1` `p-1.5` `p-2` `p-3` |
| Default border radius | `rounded` (4px) |
| Larger panels / media | `rounded-md` max |
| Section breaks (rare) | `gap-8` `p-12` |

Never use `gap-8+` or `p-8+` for component-level spacing.

---

## 3. Color Tokens (use exclusively — no hex, no zinc-*, no gray-*)

```
background         → page base
foreground         → primary body text / subtle surface tint
foreground-accent  → emphasized text, hover
title              → headings
title-foreground   → text on a title-colored surface
subTitle           → muted / secondary text
border-color       → all borders and dividers
icon-color         → icon fills
brand              → primary accent — sparse, < 10% of screen
info               → informational state
danger             → destructive / error state
warning            → caution state
success            → positive / complete state
success-accent     → stronger positive emphasis
```

---

## 4. Breakpoints (custom — Tailwind defaults do nothing here)

```
mobile:   min-width: 415px
tablet:   min-width: 768px
laptop:   min-width: 1024px
desktop:  min-width: 1440px
```

Never use `sm:` `md:` `lg:` `xl:` — they are not configured.

---

## 5. Typography

| Token | Font | Use |
|---|---|---|
| `font-primary` | Inter | body, UI copy, labels, inputs |
| `font-secondary` | Proxima Nova | headings, display |

Scale:

```
text-[10px] / text-[11px]  → captions, metadata, micro-labels
text-xs  (12px)            → helper text, badges
text-sm  (14px)            → secondary body, table rows
text-base (16px)           → primary body
text-lg  (18px)            → lead paragraphs
text-xl+                   → subheadings and above
```

---

## 6. Depth — Borders and Contrast, Not Shadows

```tsx
// ✓ correct layering
bg-background          // page base
bg-foreground/5        // card, panel
bg-foreground/10       // hover, selected row
ring-1 ring-border-color // card outline on flat bg

// ✗ never
shadow-md shadow-lg drop-shadow-*
```

Use `shadow-compact` (custom token) only for modals and floating elements that must clearly float above the page.

---

## 7. Shared Primitives (reuse these exactly)

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

## 8. Animations (Framer Motion)

Animate **only** `opacity` and `transform`. Duration: `0.1s–0.3s`.

```tsx
// Entrance
initial={{ opacity: 0, y: 8 }}
animate={{ opacity: 1, y: 0 }}
transition={{ duration: 0.2, ease: "easeOut" }}

// Stagger — keep tight
staggerChildren: 0.05

// Card hover lift
whileHover={{ y: -2 }}
transition={{ type: "spring", stiffness: 400, damping: 25 }}

// Button press
whileTap={{ scale: 0.97 }}
```

Always respect reduced motion:

```tsx
const reduced = useReducedMotion()
const transition = reduced ? { duration: 0 } : { duration: 0.2, ease: "easeOut" }
```

---

## 9. Hard Prohibitions

```
✗ .ts / .js / .tsx files that only hold CSS class strings
✗ styles.ts, classNames.ts, ui.ts, or any constants file for Tailwind classes
✗ clsx() or cn() just to store static class strings in variables
✗ Touching globals.css unless adding a CSS variable or keyframe
✗ sm: md: lg: xl: breakpoints
✗ Hardcoded hex colors
✗ bg-zinc-* bg-gray-* text-zinc-* text-gray-*
✗ rounded-full except avatars, status dots, or truly circular buttons
✗ Animating width, height, top, left
✗ drop-shadow or box-shadow for depth
✗ New accent colors outside defined tokens
✗ Inline styles
```

---

## 10. Pre-output Checklist

- [ ] All styles are inline Tailwind on JSX
- [ ] globals.css not touched
- [ ] Only token colors — no hex, no zinc, no gray
- [ ] Only `mobile:` `tablet:` `laptop:` `desktop:` breakpoints
- [ ] Spacing is compact — default gap-1/gap-2, p-1/p-2
- [ ] No box-shadow or drop-shadow for depth
- [ ] `brand` accent is sparse
- [ ] Only `opacity` and `transform` animated
- [ ] `prefers-reduced-motion` respected when using Framer Motion
- [ ] No `rounded-full` except circular shapes
