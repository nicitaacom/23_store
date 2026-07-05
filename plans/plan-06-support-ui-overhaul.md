# plan-06 — Support UI overhaul: one design language for the support dashboard + chat window + contact page

**Priority:** P1
**Screenshot:** `TODO/04.07.2026 at 16-36.png` — read it first (broken look / missing image fallback). Note: navbar overlap, sidebar hover, UUID titles and a refresh race from that screenshot were already fixed on 05.07.2026 — this plan completes the visual language.
**Recommended model:** Opus · high thinking — ~25 files across three surfaces, cross-file design consistency, one shared component (`MessageInput`) refactored under a live customer flow
**Status:** see [plan-00-tracker.md](plan-00-tracker.md)
**Depends on:** —

## §0 Why

The support area mixes two visual languages, which reads as "half loaded":

- **Token-based, theme-aware** (`bg-background`, `bg-foreground/*`, `text-title`, `text-subTitle`, `border-border-color/35`, `text-success`) — sidebars, empty states, chat window shell.
- **Hardcoded dark-only hex + off-brand violet/slate** — the actual message thread: `MessagesHeader` (`bg-[#171922]`, static always-green dot), `MessagesFooter` (`bg-[#20232d]`, `bg-violet-600`), shared `MessageBox` (`bg-violet-600` / `bg-[#21232b]`, `text-slate-*`), shared `MessageInput` (same hex family). These ignore the theme entirely.

Reference design language (Nikita: "Great example of UI patterns already in AdminPanelModal"): `bg-modal-surface` panels, gradient header + `OrganicCanvasBackground` particles, `success-accent` green on translucent fills, uppercase micro-labels, the small status badge recipe, framer-motion springs.

Also known and fixed by this plan: no avatar fallback anywhere in support (while `ImageWithFallback.tsx` exists unused there); ticket rows show no time; the support composer is a single-line input with no image support while customers have a multiline one with paste/drag-drop; `font-secondary` headings silently fall back (Proxima Nova is never loaded — do NOT try to load it here, just don't add new `font-secondary` usage); skeletons show old geometry and hex grays; `NoTicketsFound.tsx` is exported but imported nowhere.

## §1 Where it lives

| Piece | File |
| --- | --- |
| Shared composer (both surfaces) | `app/components/ui/Inputs/MessageInput.tsx` |
| Shared bubble (both surfaces) | `app/components/SupportButton/components/MessageBox.tsx` |
| Support sidebar state hook | `app/[locale]/(support)/support/tickets/hooks/useSupportTicketsSidebar.ts` |
| Sidebar shells | `.../tickets/components/{SupportTicketsSidebar,DesktopSidebar,MobileSidebar}.tsx` |
| Ticket rows (duplicates → merge) | `.../tickets/components/{DesktopSidebarTicket,MobileSidebarTicket}.tsx` |
| Unused empty state (delete) | `.../tickets/components/NoTicketsFound.tsx` + `components/index.ts` |
| Thread page + meta select | `.../tickets/[ticketId]/page.tsx` |
| Thread header / body / footer | `.../tickets/[ticketId]/components/{MessagesHeader,MessagesBody,MessagesFooter}.tsx` |
| Full-screen states (radius unify) | `.../tickets/page.tsx`, `.../[ticketId]/components/{ThisTicketIsCompleted,NoTicketFound}.tsx` |
| Chat window (SupportButtonDropdown) | `app/components/SupportButton/{SupportButton.tsx,components/SupportButtonDropdown.tsx,components/MarkTicketAsCompletedUser.tsx}` |
| Contact page | `app/[locale]/(site)/support/page.tsx` (+ new `components/OpenSupportChatButton.tsx`) |
| Skeletons (rewrite all 6) | `app/components/Skeletons/support/**` (paths + props stay — `ClientOnly.tsx` wiring untouched) |
| Ticket list data | `app/actions/getInitialTickets.ts`, `app/ts/support/ITicketDB.ts` |
| New util | `app/utils/support/getTicketRowTimeLabel.ts` |
| Design-language reference (read, don't copy blindly) | `app/components/ui/Modals/AdminPanel/components/AdminPanelHeader.tsx`, `AddProductForm.tsx`, `app/components/ui/Button.tsx`, `app/components/OrganicCanvasBackground.tsx` (find exact path by import in AdminPanelHeader) |

## §3 Expected behavior

```
BEFORE (thread)                        AFTER (everything)
┌────────────┬───────────────────┐    ┌────────────┬─────────────────────────┐
│ tokens     │ #171922 header    │    │ tokens     │ gradient header + green │
│ sidebar    │ static green dot  │    │ sidebar    │ glow, real Open/Closed  │
│ no search  │ violet bubbles    │    │ + search   │ badge, opened-date      │
│ no times   │ slate text        │    │ + times    │ green-tinted own bubbles│
│            │ 1-line input      │    │ + unread   │ token foreign bubbles   │
│            │ no images (supp.) │    │   rail     │ multiline composer with │
│            │                   │    │            │ image paste/drag-drop   │
└────────────┴───────────────────┘    └────────────┴─────────────────────────┘
light mode: thread stays dark ✗        light mode: every surface follows tokens ✓
```

## §4 Steps

> ONE TASK AT A TIME. Do task N, then STOP — show Nikita the diff and wait for his review. Do not start task N+1 until he approves.

### 1. Foundation — shared composer, bubble, time util, timestamp data

- `MessageInput.tsx`: add optional prop `onSend?: (messageBody: string, image: File | null) => Promise<void>`. With `onSend` set → clear the store value, reset height, call it. **Without `onSend` the current customer path stays byte-identical** (`uploadImagesAndSendMessage` with the same arguments — rate limits and optimistic send live in `sendMessageFn` and stay untouched). Keep `useMessagesStore` for value/image in both modes; `PastedImagePreview` keeps working unchanged. Placeholder becomes a prop with the current text as default.
- Retheme `MessageInput`: bar `w-full border-t border-border-color/35 bg-background/55 px-3 py-3`; shell `flex items-end gap-2 rounded border border-border-color/25 bg-background/60 px-3 py-2 shadow-compact transition-colors duration-150 focus-within:border-brand/40 focus-within:bg-background`; textarea text `text-title placeholder:text-subTitle/55`; send button = AdminPanel accent recipe `flex h-8 w-8 shrink-0 items-center justify-center rounded border border-success-accent/30 bg-success-accent/10 text-success-accent transition-colors duration-150 hover:bg-success-accent/15 disabled:cursor-not-allowed disabled:opacity-45`.
- `MessageBox.tsx`: own bubble `rounded-br border-success-accent/30 bg-success-accent/12 text-title shadow-compact`; foreign `rounded-bl border-border-color/30 bg-background/70 text-title shadow-compact`; avatar via `ImageWithFallback` (`h-8 w-8 shrink-0 rounded border border-border-color/30 bg-background/70 object-cover shadow-compact`); meta row `text-subTitle` tones, separator dot `bg-subTitle/40`, read receipts `text-success-accent`. Rename the misleading `inverseColors` prop → `showTimezone` (it only switches `formatTime`'s timezone suffix; two call sites). Keep the image-caption gradient `from-black/50` (sits on the image, theme-neutral). Add optional `animateEntry?: boolean` (wired in task 7).
- New `app/utils/support/getTicketRowTimeLabel.ts`: today → `formatTime(dateString, true)`; else → `getSupportMessageDayLabel(dateString)`. Pure reuse of the two existing utils.
- Timestamps without schema change: `ITicketDB` gets `last_message_at?: string`; `getInitialTickets` embeds newest message time —
  `select(\`*, 23_messages(created_at)\`)` + `.order("created_at", { referencedTable: "23_messages", ascending: false }).limit(1, { referencedTable: "23_messages" })`, then map to `last_message_at: row["23_messages"]?.[0]?.created_at ?? row.created_at` and strip the embedded array. In `useSupportTicketsSidebar`, the `tickets:update` handler also sets `last_message_at: new Date().toISOString()` on arrival.
- Gate: `pnpm type-check` + `pnpm lint` green; chat window sends exactly as before.

STOP — show Nikita the diff and wait for his review.

### 2. Support dashboard aside — search, merged rows, timestamps

- `useSupportTicketsSidebar.ts`: add `searchQuery` state + `filteredTickets` memo (case-insensitive match on `owner_username`, `last_message_body`, `id`); `ticketsAmount` stays the total.
- **Sort rule (Nikita's correction — replaces today's count-based sort):** tickets WITH unread messages go on top, ordered by unread FRESHNESS — the ticket whose unread arrived most recently is first ("unread for shorter time are shown at a top"). The unread COUNT does not affect the order (it stays only as the badge number). Read tickets follow, newest `last_message_at ?? created_at` first. The sort code MUST carry a comment explaining the reason, in Nikita's words: `// freshest unread first — Margulan thin-pancakes: you want to eat fresh pancakes instead of 1 day old pancake that is not fresh anymore; also an old unread often means the user already resolved the issue themselves and it's no longer relevant`. Implementation: track when a ticket's unread arrived (e.g. `unreadArrivedAt` map set in the `tickets:update` handler; on initial page open, tickets with unread from the server sort among themselves by `last_message_at`).
- **Unread direction guard:** intended logic — "user msg support -> support unread count bumps; support msg user -> user unread count bumps". Verify what the send route actually triggers `tickets:update` for; if support replies also fire it, `handleUpdate` must skip `increaseUnreadMessages` when the payload's message came from support (own replies never bump the badge on the support dashboard).
- Pusher events, seen-tracking otherwise untouched.
- `SupportTicketsSidebar` passes one shared search state into both sidebars. Panel shells `rounded-md` → `rounded-lg`. Search field: `SearchInput` under the header block — **must pass `autoFocus={false}`** (it autofocuses by default and would steal focus from the composer), `placeholder={t("support.search_placeholder")}` (key from task 8), `className="h-9"`.
- Merge `DesktopSidebarTicket` + `MobileSidebarTicket` (near-identical) → one `SidebarTicketRow.tsx` (`<li>` wrapping `<Link>` with `onClick`): fixes the `<li>`-inside-`<nav>`-without-`<ul>` markup in `MobileSidebar` (both lists become `<nav><ul>…`), removes the no-op `twMerge(..., unseenMessagesAmount === 0 && "text-title")` and the stray `export const dynamic = "force-dynamic"` (client component). Row: line 1 name + right-aligned `getTicketRowTimeLabel(...)` in `shrink-0 text-[10px] tabular-nums text-subTitle/75`; line 2 preview + unread badge in the badge recipe `rounded border border-success-accent/30 bg-success-accent/12 px-1.5 py-0.5 text-[10px] font-semibold text-success-accent`; line 3 existing `TICKET • #id` micro-row. Unread affordance: left rail `absolute inset-y-3 left-0 w-0.5 rounded-full bg-success-accent` + row tint `border-success-accent/25 bg-success-accent/[0.06]`. Avatar via `ImageWithFallback` + `useSender`. Update `components/index.ts`; delete `NoTicketsFound.tsx` (imported nowhere; sidebars keep their inline empty cards — a 320px rail is too narrow for the illustration assets).
- Empty states: existing "no tickets" card + new `t("support.no_search_results")` variant when `searchQuery` is set.

STOP — show Nikita the diff and wait for his review.

### 3. Thread — header redesign + composer parity

- `[ticketId]/page.tsx`: rename `getIsTicketOpenCache` → `getTicketMetaCache`, select `"is_open, created_at"`; pass `is_open` + `ticket_created_at` into `MessagesHeader`; shell `rounded-2xl` → `rounded-lg` + add `relative`; mount `<DragAndDropArea />` as last child so support gets drag-drop; remove the no-op `twMerge(..., ticketId && "flex")`.
- `MessagesHeader.tsx`: fix the interface name (`MobileSidebarProps` → `MessagesHeaderProps`). Rebuild on the AdminPanel gradient signature: wrap in `OrganicCanvasBackground` (`particleCount={3}`, `brandHsl="137, 82%, 52%"`, `verticalOverflow={18}`) with `className="overflow-hidden border-b border-border-color/30 bg-[radial-gradient(circle_at_top_left,rgba(63,224,107,0.12),transparent_30%),linear-gradient(135deg,rgba(17,20,26,0.98),rgba(23,29,38,0.96))]"`, `parentClassName="relative flex items-center justify-between gap-3 px-3 py-3 tablet:px-4"`. Avatar via `ImageWithFallback` (`h-10 w-10 rounded-md border border-white/10 object-cover`) — **delete the static always-green dot** and its `border-[#171922]` ring. Eyebrow `text-[10px] font-semibold uppercase tracking-[0.18em] text-success/85` → "Customer • #{id.slice(0,8)}"; title `truncate text-[18px] font-semibold text-white tablet:text-[20px]`. Real status: badge `rounded border border-success-accent/30 bg-success-accent/12 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-success-accent` → `t("support.status_open")`, danger-tinted variant for `t("support.status_closed")`, from `is_open`; next to it `text-[11px] text-white/50` → `t("support.opened_on", { date: getSupportMessageDayLabel(ticket_created_at) })`. `MarkTicketAsCompletedSupport` stays; pass override classes for the gradient background (`border-success-accent/30 bg-success-accent/10 text-success-accent hover:bg-success-accent/15`) — check contrast on the gradient in BOTH themes at review.
- `MessagesFooter.tsx`: rewrite onto `<MessageInput onSend={handleSend} placeholder={t("support.reply_placeholder")} />`. `handleSend`: optional image upload via the same upload util the customer flow uses (`uploadImageFn`, bucket `23_public-images`) then the existing `supportSDK.sendMessage({ ..., images, messageSender: "support" })` — the support reply still arrives via the pusher echo (no optimistic add, same as today). Clear the store image after send.
- **Per-ticket drafts (Nikita's blitz decision):** typed-but-unsent text belongs to ITS ticket. Support types in ticket A, switches to B, types and sends in B, returns to A → A still shows the typed text; sending clears only that ticket's draft. Mechanism: a `Record<ticketId, draftText>` held in `useState` in the closest client component that stays mounted across ticket switches (Nikita's suggestion — "use useState - (I think with record)"); if no client parent survives the `[ticketId]` route swap, hold the record in a small non-persisted zustand store instead (rule 10 pattern) — show which one at this task's STOP with the diff.
- `MessagesBody.tsx`: only the `showTimezone` prop rename (day-divider labels already match the badge recipe).
- Radius/eyebrow unify: `tickets/page.tsx`, `ThisTicketIsCompleted.tsx`, `NoTicketFound.tsx` → `rounded-2xl` → `rounded-lg`, eyebrows to `text-success` recipe; theme illustrations stay.

STOP — show Nikita the diff and wait for his review.

### 4. Chat window (SupportButtonDropdown)

- `SupportButtonDropdown.tsx`: panel `rounded-lg border border-border-color/35 bg-modal-surface shadow-compact-lg` (sizes stay `h-[440px] w-[min(92vw,390px)] mobile:h-[540px]`). Header → same gradient signature as task 3 (`particleCount={2}`, `verticalOverflow={12}`): icon chip `flex h-8 w-8 shrink-0 items-center justify-center rounded border border-white/16 bg-white/8 text-success-accent`; eyebrow "Support" in the standard recipe; title `text-[16px] font-semibold text-white mobile:text-[18px]`; response-time line `text-[11px] text-white/55`. Hardcoded "Support is ready" → `t("support.ready_title")`. Body, day dividers, `MessageInput` mount, `DragAndDropArea` unchanged.
- `MarkTicketAsCompletedUser.tsx`: trigger swaps the theme-branched PNG (+ `useDarkModeStore` import) for `FiCheckCircle` in an icon button `flex h-8 w-8 items-center justify-center rounded border border-white/16 bg-white/8 text-white/85 transition-colors duration-150 hover:border-success-accent/40 hover:bg-success-accent/15 hover:text-success-accent` (+ existing disabled state). The 3-step overlay cards unify to `rounded-lg border border-border-color/35 bg-foreground/95 p-4 shadow-compact-lg`; their hardcoded strings stay → plan-08.

STOP — show Nikita the diff and wait for his review.

### 5. Contact page `(site)/support/page.tsx`

Server component stays. Container `mx-auto flex min-h-[calc(100vh-64px)] w-full max-w-5xl flex-col justify-center gap-6 px-4 py-10`; eyebrow (`text-success` recipe) → `t("support.title")`; `h1` `text-3xl font-bold tracking-tight text-title tablet:text-4xl`; sub `text-base text-subTitle` → `t("support.subtitle")`. Cards `grid gap-3 tablet:grid-cols-3`, card `flex flex-col gap-3 rounded-lg border border-border-color/35 bg-foreground/35 p-4 transition-colors duration-150 hover:border-brand/30`, icon chips `flex h-9 w-9 items-center justify-center rounded border border-brand/20 bg-brand/10 text-brand` (`MdOutlineEmail` / `BiSupport` / `FaTelegramPlane`), titles reuse existing `support.option_*` keys, action pinned with `mt-auto`:
- Email → `Button variant="default-outline"` `href={mailto:}` → `t("support.email_us")`, address shown as `text-xs text-subTitle`.
- Live chat → new client component `app/[locale]/(site)/support/components/OpenSupportChatButton.tsx`: `Button variant="default"` calling `useSupportDropdown().openDropdown()` → `t("support.open_live_chat")` (`SupportButton` mounts in the same `(site)` layout — verified, the panel opens bottom-right).
- Telegram → `Button variant="default-outline"` `href={NEXT_PUBLIC_TELEGRAM_URL}` `target="_blank"` → `t("support.open_telegram")` (replaces the raw-URL link with the no-op `hover:opacity-[99]`).

STOP — show Nikita the diff and wait for his review.

### 6. Skeletons

Rewrite all 6 under `app/components/Skeletons/support/` with token `animate-pulse` blocks (`rounded bg-foreground/60`, `bg-foreground/40`) matching the NEW geometry; keep file paths, export names and the `{ ticketId }` prop so `ClientOnly.tsx` stays untouched; drop `react-loading-skeleton` from these files only (other skeletons keep it):
- `SupportPageLoadingSkeleton`: root `bg-background`, keep `NavbarSkeleton`, shell mirrors the real layout (`pt-16` + `h-[calc(100vh-64px)]` paddings).
- `DesktopSidebarSkeleton`: real width `w-[320px]` (today it lies at `w-64`), panel `rounded-lg border-border-color/35 bg-foreground/5`, header bars + search bar `h-9` + 5 row placeholders (40px avatar + text bars).
- `MessagesHeaderSkeleton`: token strip + avatar/eyebrow/title/badge placeholders; remove the hardcoded "Active" text and PNG icon (closes the TODO comment in that file).
- `MessagesBodySkeleton`: 3-4 alternating bubble placeholders instead of one flat gray block.
- `MessagesFooterSkeleton`: token bar + input shell + 8×8 button square. `MobileSidebarSkeleton`: full-width mirror. `SupportPageSkeleton`: keep the `ticketId` branch; "select ticket" block becomes the token empty-panel card.
- **NEW `app/[locale]/(support)/support/tickets/[ticketId]/loading.tsx`** (Nikita's blitz decision): clicking a ticket row in the aside must immediately show how messages are loading instead of keeping the previous ticket's messages on screen — render the thread shell with `MessagesHeaderSkeleton` + `MessagesBodySkeleton` + `MessagesFooterSkeleton` (the rebuilt token versions from this task).

STOP — show Nikita the diff and wait for his review.

### 7. Motion (framer-motion ^10.18.0, already installed)

| Element | Pattern | Timing |
| --- | --- | --- |
| Dropdown panel (`SupportButton.tsx`) | replace the CSS visible/translate classes with `<AnimatePresence>` + `motion.div` `initial={{opacity:0,y:12,scale:0.98}}` / `animate` / `exit={{opacity:0,y:8,scale:0.98}}`; keep `origin-bottom-right` + pointer-events handling | spring stiffness 380, damping 32 (~200ms — big surface) |
| New-message pop-in (`MessageBox` root → `motion.li`) | guards in `SupportButtonDropdown` + `MessagesBody`: `initialIdsRef = useRef(new Set(messages.map(m => m.id)))`; `animateEntry={!initialIdsRef.current.has(message.id)}`; `initial={animateEntry ? {opacity:0,y:6} : false}` | duration 0.12s easeOut (initial page load never animates) |
| Ticket-row re-sort (`SidebarTicketRow` → `motion.li layout="position"`) | list wrapped in `<AnimatePresence initial={false} mode="popLayout">`; enter fade 0.12s, exit fade 0.10s | layout spring stiffness 420, damping 34 (~150ms) |

Nothing else animates (badges and headers stay static). Existing 150ms CSS hover transitions stay CSS. Fallback if `mode="popLayout"` misbehaves with `<ul>/<li>`: cut the exit animation, keep `layout` only.

STOP — show Nikita the diff and wait for his review.

### 8. i18n keys + docs (incl. the UI style doc)

- **13 new keys**, appended at IDENTICAL line numbers in all 4 of `app/locales/{en,ru,fi,se}.ts` (each file is exactly 526 lines today; translate matching the existing `support.*` block tone at lines 476-491): `support.search_placeholder`, `no_search_results`, `status_open`, `status_closed`, `opened_on` (`"Opened {date}"`), `ready_title`, `message_placeholder`, `reply_placeholder`, `title`, `subtitle`, `email_us`, `open_live_chat`, `open_telegram`. Pre-existing hardcoded support-dashboard on-screen strings stay untranslated here → plan-08.
- **NEW `app/[locale]/(support)/support/dev_readme-ui-support.md`** — the support design language WITH examples, one copy-paste class string per pattern + where it's used (file refs): panel surfaces (`bg-modal-surface` vs `bg-foreground/35`, when each), gradient header signature + `OrganicCanvasBackground` props, eyebrow/micro-label recipes, badge recipe (`border-<color>/20-30 bg-<color>/10-12 text-<color>`), accent button recipe, own/foreign bubble recipes, `.panel-scroll`, and the motion timing table (75-150ms small elements, ~200ms panels — larger surface = longer duration). Add its row to the CLAUDE.md dev_readme map.
- Update: support dev_readme (send flow via `onSend`), tickets components dev_readme (it documents a `TicketsList.tsx` that does not exist — rewrite for `SidebarTicketRow`, search state, `last_message_at` sourcing, `NoTicketsFound` removal), Inputs dev_readme (`MessageInput` props: omitting `onSend` = customer flow), Skeletons dev_readme (support skeletons are token `animate-pulse`, no `react-loading-skeleton`).

STOP — show Nikita the diff and wait for his review.

## Verification (per task and at the end)

- `pnpm type-check` and `pnpm lint` after every task.
- End: grep returns zero hits for `#171922|#20232d|#21232b|#23252d|#202020|violet-|slate-|emerald-` under `app/[locale]/(support)`, `app/components/SupportButton`, `app/components/Skeletons/support` (+ `MessageInput.tsx`); `grep -c "" app/locales/*.ts` shows equal line counts.
- Only Nikita verifies in the running app (styles compile per page request — reload the page once after a dev-server restart before judging): light/dark contrast on the gradient headers, pusher realtime flows, support image drag-drop, animation feel, the embedded `23_messages(created_at)` result shape (the `?? created_at` fallback keeps rows rendering either way).

## Watch-outs

1. `MessageInput` refactor sits under the live customer send path — the no-`onSend` branch must stay byte-identical.
2. Shared `useMessagesStore` draft: the support composer's per-ticket drafts (task 3) must not leak into the chat window's composer in the same session — when `MessagesFooter` unmounts, leave the per-ticket record intact but reset the shared `messageBodyValue`/`image` the chat window reads.
3. twMerge/CVA order when overriding `Button`/`BaseInput` — overrides go through `className` (last wins); watch `bg-success-accent/[0.06]` row tint vs `hover:bg-foreground`.
4. `revalidate = 5` on `[ticketId]` page: header meta may lag 5s — unchanged behavior, not a regression.
5. Keys for `AnimatePresence mode="popLayout"` must be stable (`ticket.id`, `message.id`); day-divider list items stay outside the motion wrapper.

## Decisions made (do not re-open)

- Scope: "Whole support /support and SupportButtonDropdown in order to match 1 style".
- Direction, verbatim: "I already like the beginning of how it looks but design looks incomplete and it looks like not fully loaded. I think something needs backgrounds that would naturally match to look good - no need to copy other UI. Great example of UI patterns already in AdminPanelModal".
- Accent: brand green (`success-accent` recipes) — the violet/slate/hex family is removed.
- Upgrades: sidebar search + timestamps, support composer parity, honest status header, motion layer — all in.
- Motion, verbatim: "no need to freak out with animations too much but make them very short like duration 75ms or 150ms (higher duration is required for bigger components - so if something takes more space on UI it require more animation duration)".
- Tech: "tailwind + css (Only where tailwind is not enough) + framer-motion".
- One plan, staged sub-tasks, STOP after each (this file).
- This plan does NOT translate pre-existing strings (plan-08 does).
- Sort, verbatim: "actually messages that are unread for shorter time are shown at a top - so count of messages does not affect the order. also need to explain in commented line the reason for that: analogy with Margulan thin-pancakes: you want to eat fresh pancakes instead of 1 day old pancake that is not fresh anymore. second reason is because user might resolved issue themselfs and it's no longer relevant".
- Unread logic, verbatim: "it's no agents that replies to users - only real human replies to users. unread logic: user msg support -> support unread count bumps; support msg user -> user unread count bumps".
- Terminology: say "support" (a real human), never "agent".
- Drafts, verbatim: "actually use useState - (I think with record) so when support typed a message in ticket A (not sent) switched to ticket B - typed another message in ticket B (sent) and then switch back to ticket A then message is still present in dicket A".
- Ticket-click waiting UI, verbatim: "show another skeleton that demonstrate how messages are loading e.g MessagesBodySkeleton (which is already implemented)" — implemented as the `[ticketId]/loading.tsx` in task 6.

## Code patterns to follow

- `dev_readme-code-patterns.md` — all 15 rules; rule 9 (no exported className consts — repeat the gradient string inline like `AdminPanelHeader`/`ManageProductView` do), rule 15 + deps-ref pattern, terminology bans.
- `good-bad-examples.md` — naming, no throwaway aliases, toast hook first.
- `app/components/ui/Modals/AdminPanel/dev_readme-adminPanel.md` — the reference language's documented conventions (tab/header patterns, group-hover scoping).
- `app/components/ui/Inputs/dev_readme.md`, `app/[locale]/(support)/support/dev_readme.md`, `app/[locale]/(support)/support/tickets/components/dev_readme.md`, `app/components/Skeletons/dev_readme.md` — the docs this plan updates.

Read them BEFORE coding; validate each task's diff against them line-by-line before saying done; rewrite touched code to match where a file drifts.

➡️ Next plan: [plan-07-support-prefilled-message.md](plan-07-support-prefilled-message.md)
