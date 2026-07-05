# dev_readme-ui-support — the support design language

## 0. Why this exists

The support area used to mix two looks: token-based theme-aware surfaces (sidebars, empty states)
and hardcoded dark-only hex with off-brand violet/slate (the message thread). That read as "half
loaded". This doc is the single place that writes down the ONE look every support surface now shares,
with a copy-paste class string per pattern so a new support component matches without guessing.

Reference: the AdminPanel modal (`app/components/ui/Modals/AdminPanel`) — gradient header, brand-green
accents, uppercase micro-labels, framer-motion springs. We do NOT copy it blindly; we reuse its recipes.

Accent is brand green (`success-accent`). The violet / slate / dark-hex family is gone from support.

## 1. Where each surface lives

| Surface | File |
| --- | --- |
| Chat window (customer) | `app/components/SupportButton/components/SupportButtonDropdown.tsx` |
| Shared bubble | `app/components/SupportButton/components/MessageBox.tsx` |
| Shared composer | `app/components/ui/Inputs/MessageInput.tsx` |
| Dashboard sidebar row | `app/[locale]/(support)/support/tickets/components/SidebarTicketRow.tsx` |
| Thread header | `app/[locale]/(support)/support/tickets/[ticketId]/components/MessagesHeader.tsx` |
| Contact page | `app/[locale]/(site)/support/page.tsx` |

## 2. Terminology

- **support** — a real human who replies to customers. Never "agent".
- **support dashboard** — the staff view at `/support/tickets` (sidebar of tickets + open thread). Not "inbox".
- **chat window** — the bottom-right dropdown a customer opens (`SupportButtonDropdown`).
- **eyebrow** — the tiny uppercase label above a title (e.g. `SUPPORT`, `CUSTOMER • #id`).

## 3. Recipes (repeat these inline — we never export a className const, rule 9)

### Panel surfaces

- Chat window / modal-like panels: `bg-modal-surface` — `SupportButtonDropdown` shell.
- Dashboard sidebar shell: `bg-foreground/5` inside `rounded-lg border border-border-color/35`.
- Full-screen states + contact cards: `bg-foreground/35`.

### Gradient header (thread + chat window)

Wrap the header in `OrganicCanvasBackground` (find it at `app/components/OrganicCanvasBackground.tsx`):

```tsx
<OrganicCanvasBackground
  className="overflow-hidden border-b border-border-color/30 bg-[radial-gradient(circle_at_top_left,rgba(63,224,107,0.12),transparent_30%),linear-gradient(135deg,rgba(17,20,26,0.98),rgba(23,29,38,0.96))]"
  parentClassName="relative flex items-center justify-between gap-3 px-3 py-3 tablet:px-4"
  particleCount={3}          // 2 for the smaller chat window
  brandHsl="137, 82%, 52%"
  verticalOverflow={18}>     // 12 for the smaller chat window
```

The gradient is a fixed dark radial — text/icons on it use white / `text-success-accent` tokens, not
theme tokens. Check contrast on it in both light and dark themes.

### Eyebrow / micro-label

```
text-[10px] font-semibold uppercase tracking-[0.18em] text-success/85
```

### Badge (status, unread count)

Same shape, swap the color: `border-<color>/20-30 bg-<color>/10-12 text-<color>`.

```tsx
// open status / unread count (green)
"rounded border border-success-accent/30 bg-success-accent/12 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-success-accent"
// closed status (danger)
"rounded border border-danger/30 bg-danger/12 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-danger"
```

### Accent icon button (send, close)

```
flex h-8 w-8 shrink-0 items-center justify-center rounded border border-success-accent/30 bg-success-accent/10 text-success-accent transition-colors duration-150 hover:bg-success-accent/15 disabled:cursor-not-allowed disabled:opacity-45
```

### Message bubbles (`MessageBox`)

```tsx
// own
"rounded-br border-success-accent/30 bg-success-accent/12 text-title shadow-compact"
// foreign
"rounded-bl border-border-color/30 bg-background/70 text-title shadow-compact"
```

### Scroll area

Long lists / threads use the shared `.panel-scroll` utility (defined in `globals.css`).

## 4. Motion (framer-motion)

Small elements 75–150ms; bigger surfaces need longer — a larger surface takes more duration.

| Element | Pattern | Timing |
| --- | --- | --- |
| Chat window panel | `AnimatePresence` + `motion.div` (opacity/y/scale) | spring stiffness 380, damping 32 (~200ms) |
| New-message pop-in | `MessageBox` root `motion.li`, guarded so initial load never animates | duration 0.12s easeOut |
| Ticket-row re-sort | `SidebarTicketRow` `motion.li layout="position"` inside `AnimatePresence mode="popLayout"` | layout spring stiffness 420, damping 34 (~150ms) |

Badges and headers stay static. Existing 150ms CSS hover transitions stay CSS.
