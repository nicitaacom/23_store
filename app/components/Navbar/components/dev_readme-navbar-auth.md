# Navbar sign out

`LogoutDropdownItem.tsx` signs out through the Supabase browser client. Check the returned error
before clearing `useUser`; a failed request leaves the session active and shows a translated error.

On success, `useUser.logoutUser()` clears the client user and avatar URL. `AvatarDropdown.tsx`
immediately renders `OpenAuthModalButton` while its old server props are still mounted, so its
owner and admin actions disappear at once. A full browser navigation to `/${locale}` then asks
the server for a fresh session and page. Keep the locale prefix when changing this path.

The menu's open state lives inside `AvatarDropdown.tsx`. The old `useAvatarDropdown` Zustand store
had no callers and was removed. When changing logout behavior, inspect this component,
`LogoutDropdownItem.tsx`, `Navbar.tsx`, and `useSetUser.ts`.
