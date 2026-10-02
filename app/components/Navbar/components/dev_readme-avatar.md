# Saved account avatar

The account's custom avatar URL lives in `23_users.avatar_url`. `Navbar.tsx` reads it with the
user's roles, and uses the Supabase provider photo only when the DB value is empty. The browser
menu prefers an avatar just set by `UpdateAvatarModal.tsx`, then the server DB value, then the
provider photo. It does not use the `avatarUrl` cookie to choose the navbar image; a cookie from
an earlier account or request must not replace the signed-in account's DB value.

`UpdateAvatarModal.tsx` writes a custom URL through `/api/account/avatar` and updates the client
preview immediately. OAuth callbacks call `syncPublicUserRecord()` before redirecting. That
function keeps a saved avatar from any matching email row ahead of provider metadata when auth
IDs change after a restore or provider login. `callback/oauth/route.ts` redirects to the
localized URL returned by `getLocalizedAppUrl()`.

To debug a provider photo replacing a custom photo: check the `23_users.avatar_url` row for the
current auth user, then the callback sync result, then `Navbar.tsx`'s server prop. The avatar
cookie is retained for older consumers, but the navbar does not read it.
