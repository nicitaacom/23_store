# i18n (translations)

## 0. Why this exists

The store ships in 4 languages (`fi`, `en`, `ru`, `se`) via `next-international`. Buyers in each locale
should never see a raw English sentence baked into a component - that used to happen silently (a literal
string typed straight into JSX compiles fine, ships fine, and only gets noticed when someone screenshots
it). `eslint-rules/no-untranslated-ui-i18n.js` (rule id `local-rules/no-untranslated-ui`) now catches this
at lint time: any JSX text or `alt`/`aria-label`/`placeholder`/`title` literal containing a letter fails
the build unless it's translated, marked technical, or the file is on the explicit exception list below.

Not every string needs a key. Admin-only tools, the support dashboard, auth-callback error screens, and
internal owner-notification emails are Nikita-only or support-only surfaces - translating them would be
wasted work with no buyer ever seeing the English. That "translate vs. leave English" split was decided in
[plans/plan-08-i18n-sweep.md](../../plans/plan-08-i18n-sweep.md); the rule's exception list mechanically
encodes that same decision so it survives future refactors instead of relying on someone remembering it.

## 1. How does it look like?

### 1.1 Setup

```json
// package.json
"next-international": "^1.3.1",
```

- `app/locales/config.ts` - the 4 locale loaders (`en`, `fi`, `ru`, `se`)
- `app/locales/client.ts` - `useI18n`, `useScopedI18n`, `I18nProviderClient`, `useChangeLocale`, `useCurrentLocale` (client components)
- `app/locales/server.ts` - `getI18n`, `getScopedI18n`, `getCurrentLocale`, `getStaticParams` (server components / route handlers)
- `app/[locale]/` - every route lives under this dynamic segment
- `proxy.ts` (Next's renamed `middleware.ts`) - runs `createI18nMiddleware` first, then auth/rate-limit/role checks; default locale is hardcoded to `fi` (`resolveLocaleFromRequest: () => "fi"`, browser language is ignored on purpose), `urlMappingStrategy: "rewrite"`
- Picking a language: `LanguageDropdown.tsx` calls `useChangeLocale()` (next-international's own hook), which pushes a locale-prefixed URL - `proxy.ts`'s `addLocaleToResponse` sets the `Next-Locale` cookie from that URL. There is no hand-written `document.cookie` write anymore (a previous hand-rolled version raced against Next's background prefetching and got silently reverted - see `plans/plan-01-language-switcher.md` if that pattern ever reappears, don't repeat it).

### 1.2 Types + file pathnames

- `TLocaleTag` - `app/ts/types/i18n/TLocaleTag.ts` (`"en" | "fi" | "ru" | "se"`)
- `TI18nFunction` - `app/ts/types/i18n/TI18nFunction.ts` (`ReturnType<typeof useI18n>` - the **root**, unscoped translator; functions that take `t` as a parameter almost always want this one, not a scoped hook - see §3 pitfall below)

### 1.3 Where the keys live (ASCII)

```
app/locales/
├── en.ts   (752 lines) ─┐
├── fi.ts   (752 lines)  │  same flat key set in all 4 -
├── ru.ts   (750 lines)  │  checked by diffing key lists,
└── se.ts   (750 lines) ─┘  not by raw line count (see §2)

  "namespace.key": "Value with {placeholder}",
       │        │
       │        └─ useScopedI18n("namespace") → t("key")
       └─ useI18n() → t("namespace.key")
```

### 1.4 The rule's exception list

`eslint.config.mjs` has one block turning `local-rules/no-untranslated-ui` off for specific files/globs,
with the reasoning in a comment above it. Current entries: `storybook/**`, `**/*.stories.tsx`,
`app/[locale]/(support)/**` (support dashboard, support-role only), `app/[locale]/error/**` +
`app/global-error.tsx` (technical auth-callback screens with no user-facing recovery path,
`global-error.tsx` renders outside the locale layout so there's no i18n provider anyway),
`app/emails/RequestBetterPricesEmail.tsx` + `app/emails/RequestReplanishmentEmail.tsx` (owner
notifications, not buyer-facing), `CategoriesForm.tsx` / `FormatImagesForm.tsx` / `DbBackupModal.tsx` /
`UTMDashboard.tsx` (admin-only, only Nikita opens them), and `MemoryDebug.tsx` (renders `null` outside
`NODE_ENV === "development"`).

## 2. Terminology

- **Scoped vs. root translator** - `useScopedI18n("product")` returns a `t` that already has `"product."`
  baked in (`t("title")` → looks up `"product.title"`). `useI18n()` / `getI18n()` return the root `t` that
  needs the full dotted key (`t("product.title")`). Mixing them up doesn't throw - next-international
  fails to find the doubly- or non-prefixed key and silently renders the raw key string back at the user
  (see §3 pitfall). This exact bug shipped in `AddProductForm.tsx`'s create-product flow: the scoped `t`
  was passed into a helper (`createProductFn` → `createStripeProduct`) written for the root `t`, so a real
  validation error rendered as the literal text `product.description_invalid_character` instead of the
  translated sentence.
- **The locale-line convention** - keys don't have to sit on identical line numbers across the 4 files
  anymore (that broke once Prettier started wrapping long values differently per language). What must
  still match is the **key set** - run `grep -oE '"[a-z_]+\.[a-z_.]+":' app/locales/en.ts | sort -u` against
  the other 3 files and diff.
- **Technical / non-linguistic content** - brand names (`PayPal`, `Stripe`, `Klarna`, `Telegram`, `Jotion`),
  international units (`DPI`), keyboard-shortcut glyphs (`⌘`, `K`), and format examples (`ORD-123456`,
  `example@gmail.com`) don't get a locale key. Either express them as a JS string literal
  (`{"PayPal"}` instead of raw JSX text `PayPal`, since the rule only inspects `JSXText` nodes and
  `JSXAttribute` literals, not expression containers) or add
  `// eslint-disable-next-line local-rules/no-untranslated-ui -- <reason>` **directly above the line the
  rule reports** - not above the visual line the text appears on. A JSX text node's reported line is where
  the node *starts* (right after the previous `>` or `{expression}`), which for multi-line JSX is often one
  line above where the words visually sit. If a disable comment fails to suppress the warning, that's why -
  switch to the string-literal trick instead of hunting for the exact line.

## 3. How it should work (ASCII)

```
Client component                          Server component / route handler
─────────────────                          ────────────────────────────────
"use client"                                (no directive, or async function)
import { useScopedI18n } from               import { getI18n } from
  "@/locales/client"                          "@/locales/server"

const t = useScopedI18n("product")          const t = await getI18n()
t("title")  → "product.title"               t("product.title")
```

```
Helper function that takes t as a parameter (e.g. createStripeProduct, showToastWarningFn):
  - the function body uses FULLY QUALIFIED keys ("product.xxx", "payment.xxx")
  - the CALLER must therefore pass the ROOT t (useI18n() / tGlobal), never a scoped one
  - grep the function body for t(" to check which shape it expects before wiring a call site
```

```
BEFORE (bug)                                        AFTER (fixed)
const t = useScopedI18n("product")                   const t = useScopedI18n("product")
const tGlobal = useI18n()                            const tGlobal = useI18n()
...
await createProductFn(t, {...})                      await createProductFn(tGlobal, {...})
  → createStripeProduct calls                           → createStripeProduct calls
    t("product.description_invalid_character")            t("product.description_invalid_character")
    on an already-"product"-scoped t                       on the root t
    → looks up "product.product.description_..."           → looks up "product.description_..."
    → key not found → raw key string shown to buyer         → correct translated sentence shown
```

## 4. TODO / decisions made against

- **`no-untranslated-ui` sweep (this session).** Ran the rule project-wide, scoped it to the plan-08
  policy (exception list above), then translated every remaining buyer-facing warning (132 → 0) across
  ~40 files: Navbar, SupportButton widget (not the support dashboard), AdminPanel's non-admin-only forms,
  cart payment buttons, avatar/pagination/slider/timer primitives, the placeholder ecosystem pages, and
  the checkout emails. New keys follow existing namespace conventions (`common.*` for shared primitives,
  `navbar.*`, `human_check.*` for the new Turnstile challenge screen, `placeholder.*` for the 3 ecosystem
  stub pages). Decided against: translating `CategoriesForm.tsx`, `FormatImagesForm.tsx`,
  `DbBackupModal.tsx`, `UTMDashboard.tsx`, the support dashboard, and both owner-notification emails - see
  §1.4; these stay on the exception list, not because the rule fails to reach them but because plan-08
  already closed that decision.
- **`app/emails/RequestReplanishmentEmail.tsx`** has its own header comment saying it doesn't need
  translation ("old logic" pre-dating the AI e-commerce rewrite) - kept as-is, added to the exception list
  rather than re-litigated.
- **Not done / open:** the rule only inspects `JSXText` and 4 attribute names (`alt`, `aria-label`,
  `placeholder`, `title`) - a literal string passed to a `label` prop, a toast title (`toast.show("error",
  "Some text", ...)`), or a JS template literal is invisible to it. Several such strings still exist
  (e.g. `AdminPanelDeleteConfirmDialog.tsx`'s bulk-delete toast titles use template literals). Not swept
  this session - flagging here rather than silently leaving it undocumented. If this needs closing, it's
  audit-and-translate work in the same shape as plan-08, not a rule change (widening the rule to catch
  `label`/toast strings would also catch a lot of legitimate non-UI text and needs its own false-positive
  pass first).
