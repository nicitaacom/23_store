```md
# UI Design Guide — Next.js · React · Tailwind

A reference for building production-grade, visually memorable interfaces.
Follow these principles strictly. Generic AI aesthetics are banned.

---

## 1. Core Philosophy

- **Intentionality over decoration** — every visual decision must serve a purpose
- **Commit to a direction** — pick an aesthetic and execute it fully; half-measures look worse than bold choices
- **Hierarchy first** — users must instantly know what to look at and in what order
- **Motion earns attention** — animate only things that carry meaning or guide the eye

---

## 2. Typography

### Breakpoints
```

mobile: 415px — @media (min-width: 415px)
tablet: 768px — @media (min-width: 768px)
laptop: 1024px — @media (min-width: 1024px)
desktop: 1440px — @media (min-width: 1440px)

````

Always use these — never `sm:` `md:` `lg:` `xl:` (those are not defined).

```tsx
// correct
<div className="text-sm tablet:text-base laptop:text-lg" />

// wrong — does nothing
<div className="text-sm md:text-base lg:text-lg" />
````

### Rules

- `font-primary` = Inter (body, UI copy) — defined in `fontFamily.primary`
- `font-secondary` = Proxima Nova (headings, display) — defined in `fontFamily.secondary`
- Use `next/font` for zero-layout-shift loading

### Scale (Tailwind)

```
text-xs     — 12px  — labels, captions, metadata
text-sm     — 14px  — secondary body, helper text
text-base   — 16px  — primary body copy
text-lg     — 18px  — lead paragraphs
text-xl     — 20px  — subheadings
text-2xl    — 24px  — section titles
text-4xl+   — 36px+ — hero headings, display
```

### Font stack (fixed — defined in tailwind.config.ts)

```
font-primary   → Inter       → body, UI copy, labels, inputs
font-secondary → Proxima Nova → headings, display, hero text
```

### Implementation

```tsx
// tailwind.config.ts already maps font-primary / font-secondary
// just use the utilities directly:

<h1 className="font-secondary font-bold text-5xl tracking-tight">Hero Title</h1>
<p  className="font-primary font-normal text-base text-foreground">Body copy</p>
<span className="font-primary text-xs text-subTitle tracking-widest uppercase">Label</span>
```

### Visual hierarchy via type alone

```tsx
// Strong: weight + size contrast
<h1 className="font-secondary font-black text-5xl tracking-tight leading-none text-title">Title</h1>
<p  className="font-primary font-normal text-base text-foreground leading-relaxed">Body</p>
<span className="font-primary text-sm text-subTitle">Secondary / muted</span>

// Use letter-spacing intentionally:
// tracking-tight  → large display text (prevents gappiness)
// tracking-wide   → small caps, labels, uppercase metadata
// tracking-widest → decorative uppercase, section labels
```

---

## 3. Color System

### Token map (defined in tailwind.config.ts + CSS vars)

```
background        → page background
foreground        → primary body text
foreground-accent → emphasized inline text, hover states
title             → heading / display text
title-foreground  → text on top of a title-colored surface
subTitle          → secondary / muted text  (= border-color value)
border-color      → all borders, dividers   (same hsl as subTitle)
icon-color        → icon fills              (same hsl as title)
brand             → primary brand accent — use sparingly
info / danger / warning / success / success-accent → semantic states
```

### Usage

```tsx
// Text layers — hierarchy via token, not opacity hacks
<h2 className="text-title font-secondary">Section heading</h2>
<p  className="text-foreground font-primary">Primary body</p>
<p  className="text-subTitle font-primary">Secondary / helper</p>

// Borders
<div className="border border-border-color rounded-xl" />

// Brand accent (≤ 10% of screen surface)
<span className="text-brand" />
<div  className="bg-brand/10 border border-brand/30" />

// Semantic
<p className="text-danger">Error message</p>
<p className="text-success">Saved successfully</p>
<div className="bg-warning/10 text-warning border border-warning/30">Warning banner</div>
```

### Rules

- Never hardcode hex — always use the token utilities above
- `brand` is the single accent — don't introduce extra accent colors
- Surface elevation = `bg-background` → `bg-foreground/5` → `bg-foreground/10` (not drop-shadows)
- Text contrast: `foreground` on `background` must meet WCAG AA (4.5:1 body, 3:1 large text)

---

## 4. Layout & Visual Hierarchy

### Spacing scale (use consistently)

```
gap-1  / p-1   — 4px   — icon padding, tight inline
gap-2  / p-2   — 8px   — compact UI, dense tables
gap-4  / p-4   — 16px  — standard component padding
gap-6  / p-6   — 24px  — section inner padding
gap-8  / p-8   — 32px  — between related sections
gap-12 / p-12  — 48px  — major section breaks
gap-16 / p-16  — 64px  — hero padding, page sections
gap-24 / p-24  — 96px  — dramatic breathing room
```

### Grid patterns

```tsx
// 12-col responsive grid (standard)
<div className="grid grid-cols-12 gap-6">
  <main  className="col-span-12 laptop:col-span-8">...</main>
  <aside className="col-span-12 laptop:col-span-4">...</aside>
</div>

// Asymmetric editorial layout — more interesting than 50/50
<div className="grid grid-cols-12 gap-8">
  <div className="col-span-12 tablet:col-span-7">...</div>
  <div className="col-span-12 tablet:col-span-5">...</div>
</div>

// Auto-fill cards with min-width control
<div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-6">
```

### Hierarchy rules

1. **Size contrast** — headlines must be dramatically larger than body (not just 1-2 steps)
2. **Weight contrast** — mix `font-black` display with `font-normal` body
3. **Color contrast** — `text-title` primary, `text-foreground` body, `text-subTitle` secondary, `text-subTitle/50` tertiary
4. **Spatial grouping** — related items close together, sections separated by `gap-16+`
5. **One focal point per section** — don't compete for attention

### Z-axis depth (layering)

```tsx
// Use background lightness to create depth — not just shadows
bg-background              → deepest (page background)
bg-foreground/5            → cards, panels (slight lift)
bg-foreground/10           → hover states, selected rows
bg-foreground/10 + backdrop-blur → floating elements, modals
ring-1 ring-border-color   → subtle card outlines over flat backgrounds
```

### Breaking the grid (intentional)

```tsx
// Negative margin pull — lets hero art bleed out of container
<img className="-mx-6 tablet:-mx-12 w-[calc(100%+48px)]" />

// Overlap elements to create depth
<div className="relative">
  <div className="absolute -top-6 -right-6 w-32 h-32 rounded-full bg-brand/10 blur-2xl" />
  <Card />
</div>

// Full-bleed section inside contained layout
<section className="relative -mx-6 px-6 bg-foreground/5 py-16">
```

---

## 5. Animations

### Library: Framer Motion (preferred for React/Next.js)

```bash
npm install framer-motion
```

### Page entrance — staggered reveal

```tsx
import { motion } from "framer-motion"

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } }
}

const item = {
  hidden: { opacity: 0, y: 24 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.25, 0.1, 0.25, 1] } }
}

// Usage
<motion.ul variants={container} initial="hidden" animate="show">
  {items.map(i => (
    <motion.li key={i.id} variants={item}>{i.label}</motion.li>
  ))}
</motion.ul>
```

### Scroll-triggered reveal

```tsx
import { motion, useInView } from "framer-motion"
import { useRef } from "react"

const ref  = useRef(null)
const inView = useInView(ref, { once: true, margin: "-80px" })

<motion.div
  ref={ref}
  initial={{ opacity: 0, y: 32 }}
  animate={inView ? { opacity: 1, y: 0 } : {}}
  transition={{ duration: 0.6, ease: "easeOut" }}
/>
```

### Hover micro-interactions

```tsx
// Lift card on hover
<motion.div
  whileHover={{ y: -4, scale: 1.01 }}
  transition={{ type: "spring", stiffness: 400, damping: 25 }}
  className="cursor-pointer"
/>

// Button press
<motion.button
  whileHover={{ scale: 1.03 }}
  whileTap={{ scale: 0.97 }}
  transition={{ type: "spring", stiffness: 500, damping: 20 }}
/>
```

### Layout animations (smooth list reorder / height changes)

```tsx
;<motion.div layout transition={{ type: "spring", stiffness: 300, damping: 30 }}>
  {/* content can change height — animates automatically */}
</motion.div>

// AnimatePresence for mount/unmount
import { AnimatePresence } from "framer-motion"

;<AnimatePresence mode="wait">
  {isOpen && (
    <motion.div
      key="modal"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.2 }}
    />
  )}
</AnimatePresence>
```

### CSS-only animations (Tailwind — use for simple, looping)

```tsx
// Pulse badge
<span className="animate-pulse bg-brand rounded-full w-2 h-2" />

// Spin loader
<div className="animate-spin border-2 border-border-color border-t-brand rounded-full w-5 h-5" />

// Custom keyframes in tailwind.config.js
keyframes: {
  "slide-up": {
    "0%":   { transform: "translateY(16px)", opacity: "0" },
    "100%": { transform: "translateY(0)",    opacity: "1" }
  },
  "fade-in": {
    "0%":   { opacity: "0" },
    "100%": { opacity: "1" }
  }
},
animation: {
  "slide-up": "slide-up 0.4s ease-out forwards",
  "fade-in":  "fade-in 0.3s ease-out forwards"
}
```

### Animation timing guide

```
0.1–0.15s → micro (hover color, opacity toggle)
0.2–0.3s  → small UI (dropdown open, tooltip)
0.4–0.6s  → medium (page section reveal, modal)
0.6–1.0s  → large (hero entrance, full-page transition)

Easing:
ease-out         → elements entering the screen
ease-in          → elements leaving
[0.25,0.1,0.25,1] → natural, slightly springy
spring stiffness 300-500, damping 20-30 → responsive feel
```

### Rules

- Animate **one property at a time** where possible (opacity OR transform, not 4 things)
- `transform` + `opacity` only — never animate `width`, `height`, `top`, `left` (causes reflow)
- `once: true` for scroll animations — don't re-trigger on scroll up
- Respect `prefers-reduced-motion`:

```tsx
import { useReducedMotion } from "framer-motion"

const reduced = useReducedMotion()
const transition = reduced ? { duration: 0 } : { duration: 0.5, ease: "easeOut" }
```

---

## 6. Component Patterns

### Card (surface + border + hover lift)

```tsx
<motion.div
  className="bg-foreground/5 border border-border-color rounded-2xl p-6 cursor-pointer"
  whileHover={{ y: -3 }}
  transition={{ type: "spring", stiffness: 400, damping: 25 }}
>
```

### Section with visual anchor

```tsx
<section className="py-24 relative overflow-hidden">
  {/* decorative blur blob — offset, not centered */}
  <div className="absolute top-0 left-1/3 w-96 h-96 bg-brand/10 rounded-full blur-3xl pointer-events-none" />
  <div className="relative z-10 max-w-6xl mx-auto px-6">...</div>
</section>
```

### Badge / label

```tsx
<span
  className="inline-flex items-center gap-1.5 text-xs font-primary font-semibold
  tracking-widest uppercase px-3 py-1 rounded-full
  border border-brand/30 text-brand bg-brand/10">
  New
</span>
```

### Divider with label

```tsx
<div className="flex items-center gap-4 text-subTitle text-sm font-primary">
  <div className="flex-1 h-px bg-border-color" />
  <span>or</span>
  <div className="flex-1 h-px bg-border-color" />
</div>
```

---

## 7. What to Avoid

```
✗ Purple gradient on white background
✗ Generic card with drop-shadow on white
✗ Every section the same padding and layout
✗ md: lg: xl: sm: breakpoints — use mobile: tablet: laptop: desktop:
✗ Hardcoded hex colors — always use token utilities (text-title, bg-background, etc.)
✗ bg-zinc-* bg-gray-* text-zinc-* — use the defined color tokens
✗ Animating width, height, top, left (causes reflow jank)
✗ Animating everything — motion loses meaning
✗ 50/50 split layouts for every section
✗ Inline styles instead of Tailwind utilities
✗ backdrop-blur without a semi-transparent background
✗ More than 2–3 accent colors
```

---

## 8. Quick Checklist Before Shipping

- [ ] `font-primary` (Inter) used for body/UI, `font-secondary` (Proxima Nova) for headings
- [ ] Only color tokens used — no raw hex, no `text-zinc-*`, no `bg-gray-*`
- [ ] Only custom breakpoints used — `mobile:` `tablet:` `laptop:` `desktop:` (no `md:` `lg:`)
- [ ] `brand` accent appears sparingly (< 10% of screen)
- [ ] Page entrance has staggered reveal on key elements
- [ ] Hover states exist on all interactive elements
- [ ] `prefers-reduced-motion` is respected
- [ ] Only `opacity` and `transform` are animated
- [ ] Visual hierarchy is clear in 3 seconds without reading text
- [ ] Layout has at least one grid-breaking or asymmetric moment
- [ ] Spacing is consistent and uses the defined scale
- [ ] No generic AI aesthetics anywhere

```

```
