# plan-10 — Faceit login: custom OIDC flow

**Priority:** P3
**Screenshot:** — (from `// TODO - add faceit provider` at `ContinueWithButton.tsx:52`)
**Recommended model:** Opus · high thinking — auth flow, security-sensitive (state/PKCE, server-side secrets, session minting)
**Status:** see [plan-00-tracker.md](plan-00-tracker.md)
**Depends on:** —

## §0 Why

The auth modal already renders a Faceit button (`AuthContinueWith.tsx:20`), but clicking it throws:

```ts
// app/[locale]/(auth)/AuthModal/components/ContinueWithButton.tsx:50-52
} else if (provider === "faceit") {
  throw Error(`${t("auth.error.faceit_not_implemented")} ${process.env.NEXT_PUBLIC_SUPPORT_EMAIL}`)
  // TODO - add faceit provider
```

Faceit is not in Supabase's built-in provider list, so `signInWithOAuth` is not available for it. Faceit speaks standard OIDC — references (verbatim from Nikita):
- https://docs.faceit.com/getting-started/authentication/oauth2
- https://api.faceit.com/auth/v1/openid_configuration

## §1 Where it lives

| Piece | File |
| --- | --- |
| Button branch to flip | `app/[locale]/(auth)/AuthModal/components/ContinueWithButton.tsx:50-52` |
| Existing OAuth callback pattern to mirror | `app/[locale]/(auth)/auth/callback/` (+ its dev_readme) |
| OAuth debug logging to keep parity with | `app/store/ui/useOAuthDebugStore.ts` (see `ContinueWithButton.tsx:22,38`) |
| Admin client for user create/sign-in | `app/libs/supabase/supabaseAdmin` (find exact path by import) |
| New routes (this plan creates) | `app/api/auth/faceit/start/route.ts`, callback per task 2's decision |
| Supabase URL configuration note | `app/locales/dev_readme_i18n.md:17-21` (existing callback URL patterns) |

## §3 Expected behavior

```
BEFORE                                    AFTER
[Continue with Faceit] -> error toast ✗   [Continue with Faceit]
                                            -> /api/auth/faceit/start (state+PKCE, redirect)
                                            -> faceit login page
                                            -> our callback: code exchange (server-side),
                                               userinfo (email, nickname, avatar)
                                            -> supabaseAdmin find-or-create user
                                            -> session set, redirect to app, logged in ✓
```

## §4 Steps

> ONE TASK AT A TIME. Do task N, then STOP — show Nikita the diff and wait for his review. Do not start task N+1 until he approves.

1. **Discovery (no code).** Fetch and read `https://api.faceit.com/auth/v1/openid_configuration` (endpoints, scopes, PKCE support) + the faceit docs page. Report to Nikita: the redirect URI to register in the faceit app dashboard, required env vars (`FACEIT_CLIENT_ID`, `FACEIT_CLIENT_SECRET` — server-side only, never `NEXT_PUBLIC_`), and which scopes give email + nickname + avatar. STOP — show Nikita the report and wait for his review.
2. **Start route.** `app/api/auth/faceit/start/route.ts`: build the authorize URL (state + PKCE verifier in short-lived httpOnly cookies), redirect. Decide-and-record here (with Nikita at the STOP): callback path — reuse the `/[locale]/auth/callback/oauth?provider=faceit` pattern vs a dedicated `/api/auth/faceit/callback`; recommended: dedicated API callback (code exchange needs the server secret; the existing oauth callback page expects a Supabase session that faceit never creates on its own). STOP — show Nikita the diff and wait for his review.
3. **Callback route.** Validate state, exchange code (server-side, PKCE verifier), fetch userinfo. Then Supabase — the linking policy is DECIDED (see Decisions): look up by email; same email = same account, faceit becomes one more login method on it (store `user_metadata.faceit_id`); no existing user → `supabaseAdmin.auth.admin.createUser` with `email_confirm: true` (a provider login counts as email verification — no second verification ever). Session minting mechanism (e.g. `admin.generateLink` → verify, or the pattern the existing credentials callback uses — read it first) is decided at THIS STOP. Redirect to `/${locale}` on success, `/${locale}/error?error_description=...` on failure (same error path the proxy already handles). STOP — show Nikita the diff and wait for his review.
4. **Flip the button.** `ContinueWithButton.tsx` faceit branch: `window.location.assign("/api/auth/faceit/start")` (keep the `useOAuthDebugStore.setLastAttempt` payload + console logging parity with the google branch); remove the throw + TODO; keep `auth.error.faceit_not_implemented` key removal for plan-08's unused-keys task (note it there). STOP — show Nikita the diff and wait for his review.
5. **Docs.** Update the auth callback dev_readme (new flow diagram incl. faceit), list the env vars + faceit dashboard redirect URI for Nikita to configure, and add the Supabase URL-configuration line if the callback URL pattern is new. STOP — show Nikita the diff and wait for his review.

## Decisions made (do not re-open)

- Custom OIDC route (own code-flow exchange + supabaseAdmin user create/sign-in), mirroring the existing `/auth/callback/oauth` pattern — chosen over a Supabase-native spike.
- Secrets stay server-side env vars; Nikita sets them (no secrets in code or in this plan).
- Linking policy, verbatim (blitz answer): "if user already has a faceit account or google account with SAME email as user registered with credentials - then it means that user just link a new login method with faceit or google. no need to create separated accounts for same emails. Also if email is verified once (e.g user logged in wtih google or user signed in with credentials + verified email) then no need to verify email second time. assuming that if user logs in with ANY provider then email of this provider is auto-verified (valid)".
- Only the session-minting mechanism stays open until task 3's STOP.

## Code patterns to follow

- `dev_readme-code-patterns.md` — rule 5 (string error returns where files do that), terminology bans, no 1-letter names.
- `good-bad-examples.md` — SDK/API shape (`{ error: string } | { success: true }` unions in `api.d.ts`, `satisfies` request bodies).
- `app/[locale]/(auth)/auth/callback/dev_readme.md` + `app/api/dev_readme.md` — the conventions this plan's routes must match.

Read them BEFORE coding; validate each diff line-by-line before saying done; rewrite touched code to match where a file drifts.

➡️ Next plan: — (last in the build order; back to [plan-00-tracker.md](plan-00-tracker.md))
