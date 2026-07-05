## Usage for SupportTicketsSidebar.tsx

Wrapper that `layout.tsx` mounts. It calls `useSupportTicketsSidebar` once and passes the shared
`searchQuery` / `setSearchQuery` and `filteredTickets` into both the desktop and mobile sidebars, so
one search box drives both.

## Usage for DesktopSidebar.tsx

Shows all open tickets on screens 1024px+. Header block + a `SearchInput` (pass `autoFocus={false}` so
it does not steal focus from the composer) + a `<ul>` of `SidebarTicketRow`. Empty state branches:
"no tickets yet" vs `t("support.no_search_results")` when a search is active.

## Usage for MobileSidebar.tsx

Same as DesktopSidebar for screens under 1024px; full width, hidden while a ticket is open.

## Usage for SidebarTicketRow.tsx

One row = one ticket, used by BOTH sidebars (it replaced the old duplicate DesktopSidebarTicket /
MobileSidebarTicket). It is a `<li>` wrapping a `<Link>` to `/support/tickets/{id}` with an `onClick`
that resets that ticket's unread count. Three lines: name + right-aligned time label, message preview +
unread badge, then the `TICKET • #id` micro-row. Avatar via `ImageWithFallback` + `useSender`. Unread
tickets get a left rail + a faint green row tint. The root is a `motion.li layout="position"` so rows
animate when the sort order changes.

## Usage for MessagesHeader.tsx

Gradient header for the open thread: avatar, `CUSTOMER • #id` eyebrow, customer name, a real Open/Closed
status badge (from the ticket's `is_open`), an "Opened {date}" line, and the close-ticket button.

## Usage for MessagesBody.tsx

Renders every message in the thread with day dividers. New arrivals pop in; the messages present on
first render (the server `initialMessages`) never animate.

## Usage for MessagesFooter.tsx

The support reply composer. Wraps the shared `MessageInput` with `onSend`, so it uploads an optional
image then sends via `supportSDK.sendMessage({ messageSender: "support" })`. Per-ticket drafts live in
`useSupportReplyDrafts` (a small non-persisted zustand store) so an unsent reply stays with ITS ticket
when support switches tickets.

## Sort + timestamps

- Sort: tickets with unread messages sit on top, ordered by how recently the unread arrived (freshest
  first — the count does not change the order). Read tickets follow by newest `last_message_at`.
- `last_message_at` is not a DB column. `getInitialTickets` embeds the newest `23_messages(created_at)`
  per ticket and maps it (falling back to the ticket's `created_at`). The `tickets:update` handler
  stamps `new Date().toISOString()` on arrival.

## Removed

`NoTicketsFound.tsx` was exported but imported nowhere — deleted. A 320px rail is too narrow for the
illustration assets, so each sidebar keeps its own inline empty card instead.
