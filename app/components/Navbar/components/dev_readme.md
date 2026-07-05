# Navbar components

This folder contains the small building blocks used by the main navbar.

## Main idea

Navbar is split into tiny focused components instead of one large file.

That gives me:

- easier conditional rendering for logged-in vs anonymous users
- easier reuse of small UI pieces like dropdown buttons
- simpler client/server boundaries because most navbar interactions are client-only

## Files in this folder

### `NavbarWrapper.tsx`

Top-level wrapper for navbar content.

- listens to window scroll
- changes background from `bg-background` to `bg-foreground`
- keeps shared spacing, height and z-index in one place

Use this file when you want to change navbar shell behavior, not individual buttons.

### `Logo.tsx`

Brand logo link to `/`.

- picks desktop/mobile logo asset
- reads dark mode from zustand store
- uses `priority` image loading because logo is always visible

### `OpenAuthModalButton.tsx`

Anonymous-user entry point.

- opens auth modal through query params
- uses current pathname and appends `?modal=AuthModal&variant=login`

If auth modal route params change, update this file.

### `CartIcon.tsx`

Cart entry point.

- opens `CartModal` through query params
- shows SSR cart quantity first
- after mount it switches to zustand cart state for interactivity

This SSR -> client handoff avoids hydration mismatch and still keeps cart count responsive.

### `ContactButton.tsx`

Small contact dropdown.

- uses `DropdownContainer`
- closes on escape / outside click
- links to Telegram from env var `NEXT_PUBLIC_TELEGRAM_URL`

### `AvatarDropdown.tsx`

Logged-in user menu.

- shows avatar from cookie, server prop or user store
- opens `AdminPanel` with query params
- opens update-avatar modal from zustand
- exposes support links / stats for support role
- contains logout action

This is the most stateful navbar component in the folder.

### `LogoutDropdownItem.tsx`

Logout action extracted into a separate item.

- signs out with Supabase client
- clears user zustand store
- calls `router.refresh()` so server-rendered UI updates immediately

### `HamburgerMenu.tsx`

Mobile/sidebar project links menu.

- controlled by `useSidebar` zustand store
- closes on route change
- locks body scroll while open
- closes on escape / outside click / swipe
- renders external Jokik ecosystem links (`menuItems` array) — every href carries
  `?utm_source=23_store&utm_medium=hamburger_menu&utm_campaign=ecosystem` so the receiving project can
  attribute the visit; icons are transparent PNGs in `public/projects/`
- holds the **`LanguageDropdown` at the bottom on mobile** (`mt-auto` + `tablet:hidden`, opens upward via
  `isDropUp`). The navbar shows the dropdown inline only on tablet+ (`hidden tablet:flex` in `Navbar.tsx`),
  so below tablet it lives here instead.

If you want to add a new external project card, update `menuItems` here — keep the same UTM params and use
a transparent PNG for the icon.

### `CtrlKBadge.tsx`

Keyboard shortcut hint / trigger for Ctrl+K modal.

- listens for `Cmd/Ctrl + K`
- prevents browser default behavior
- does not open if another modal is already in query params

### `index.ts`

Folder barrel export.

If you add a new navbar component that should be imported elsewhere, export it here.

## Patterns used here

## 1. Query-param modals

Some navbar buttons open UI by pushing query params instead of toggling local state.

Examples:

- `OpenAuthModalButton.tsx`
- `CartIcon.tsx`
- `AvatarDropdown.tsx` for admin panel

Why:

- deep-linkable modal state
- easier refresh behavior
- consistent with the app modal system

## 2. Local dropdown/sidebar state

Small menus that do not need URL state keep their open/close state locally or in zustand.

Examples:

- `ContactButton.tsx` uses local `useState`
- `AvatarDropdown.tsx` uses local `useState`
- `HamburgerMenu.tsx` uses `useSidebar` zustand store because it behaves like app-level overlay UI

## 3. Close on outside click / escape

Dropdown-like UI uses `useOnEscOrClickOutside`.

Use this for any new floating navbar surface so behavior stays consistent.

## 4. App Router navigation

Navbar components use `next/navigation`.

- use `useRouter()` for `push()` and `refresh()`
- use `usePathname()` / `useSearchParams()` for modal/query logic

Do not add `next/router` here because this app uses the App Router.

## If you add new navbar action

1. Decide whether it should be query-param modal, local dropdown action, or global zustand overlay.
2. Keep the component small and focused on one responsibility.
3. If it is reusable, export it in `index.ts`.
4. If it opens floating UI, support escape / outside click when appropriate.
5. If it changes auth/server-rendered state, call `router.refresh()` after the mutation.
