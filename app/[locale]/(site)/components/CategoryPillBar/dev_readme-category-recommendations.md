# Category Recommendation System

## Style references
- Code patterns: `public/docs/AI_readme_code-sytle-patterns.md`
- UI tokens + breakpoints: `public/docs/UI_PROJECT_STYLE.md` and `tailwind.config.ts`
- Only token colors: `background`, `foreground`, `title`, `subTitle`, `border-color`, `success`, `success-accent`
- Only custom breakpoints: `mobile:` `tablet:` `laptop:` `desktop:` — never `sm:` `md:` `lg:` `xl:`

---

## 0. Why this exists

Every user used to see 34 parent-category pills in the same fixed order. A user who shops Beauty & Health daily still had to scroll past Automotive and Musical Instruments. This system re-orders pills and product list by category preference score so the user's most-used categories stay at the front.

Views are stored in the DB per authenticated user (`23_category_views` table). Anonymous users use `localStorage` key `"23_category_views_anon"` — views sync to DB on login.

---

## 1. How does it look like?

### 1.1 UI + component path

```
Default order (new user):
[ All ] [ FEATURED ] [ Beauty & Health ] [ Food & Grocery ] [ Home & Kitchen ] ...

After user clicks "Electronics" 5×, "Sports & Outdoors" 3×:
[ All ] [ FEATURED ] [ Electronics ] [ Sports & Outdoors ] [ Beauty & Health ] ...
```

`All` and `FEATURED` are pinned. Everything else floats by view count.

Component: [CategoryPillBar.tsx](../CategoryPillBar.tsx)
Products: [SortedProducts.tsx](../SortedProducts.tsx)

### 1.2 Types

```ts
// store shape — app/store/categories/useCategoryPreferencesStore.ts
type CategoryPreferencesStore = {
  views: Record<string, number>          // optimistic session-level counts
  recordView: (categoryId: string) => void
  clearViews: () => void
  hydrateFromDB: (dbViews: { category_id: string; view_count: number }[]) => void
  getSortedCategories: (categories: TCategory[], serverViews?: Record<string, number>) => TCategory[]
  // Note: getSortedCategories accepts optional serverViews from SSR for immediate render
}
```

### 1.3 Data tree

```
Authenticated user:
  page.tsx (SSR)
    ↓ supabase.from("23_category_views").select().eq("user_id", user.id)
    ↓ serverViews: Record<string, number>
    ↓ passed as props to: <CategoryPillBar serverViews={serverViews} />
                           <SortedProducts serverViews={serverViews} />
    ↓ no client hydration wait — sorted on first render

Anonymous user:
  localStorage key: "23_category_views_anon"
    ↓ SortedProducts reads on mount → sorts products client-side
    ↓ CategoryPillBar reads via sessionViews state → sorts pills client-side
    ↓ cleared + synced to DB on login
```

### 1.4 Store shape

```
useCategoryPreferencesStore (devtools only, no persist):
{
  views: { ... }   // session-level increments (optimistic)
  // persistent views live in DB (auth) or localStorage (anon) — NOT in Zustand
}
```

[screenshot placeholder — Supabase 23_category_views table rows]

---

## 2. Terminology

- **Signal**: user action that contributes to a category preference score.
- **Pinned**: `All` (virtual) and `FEATURED` — always positions 1 and 2.
- **Floating**: any other root category — sorted by `view_count DESC`, alpha tie-break.
- **Cold start**: new user, no views. Order = seed script insertion order.
- **serverViews**: `Record<string, number>` fetched on the server (SSR) per authenticated user. Zero-latency sort.
- **anonViews**: same shape, read from `localStorage["23_category_views_anon"]` on mount. Client-side sort.
- **Sync**: merging local views into DB on login using `GREATEST(db, local)`.

---

## 3. Signal weights

| Action | delta | Where recorded |
|---|---|---|
| Category pill click | 1 | `CategoryPillBar.handlePillClick` |
| Product page visit | 1 | `ProductDetailView` useEffect on mount |
| Like a product | 3 | `ProductLikeButton` onClick (only on like, not unlike) |
| Add to cart | 3 | `AddToCartButton` onClick |

All signals call `categoryViewsSDK.incrementDBCategoryView({ category_id, delta })` when authenticated, or write to `localStorage["23_category_views_anon"]` when anonymous.

---

## 4. ASCII flow

### Anonymous: cold start
```
User lands → SortedProducts mounts →
  localStorage["23_category_views_anon"] empty → products in default price-ASC order
  CategoryPillBar: no views → getSortedCategories → seed order
```

### Anonymous: pill click
```
Click "Electronics" →
  ① router.push(?category=<id>)
  ② CategoryPillBar updates sessionViews[id]++
     localStorage["23_category_views_anon"][id]++ (persisted for next reload)
Next render (same session):
  getSortedCategories(categories, mergedViews): Electronics moves front
  [ All ] [ FEATURED ] [ Electronics ] [ Beauty & Health ] ...
```

### Authenticated: server-sorted on load
```
page.tsx SSR:
  supabase.from("23_category_views").select().eq("user_id", user.id)
  → serverViews = { "uuid-electronics": 12, "uuid-sports": 5 }
  → <SortedProducts serverViews={serverViews} /> — sorted immediately, no flash
  → <CategoryPillBar serverViews={serverViews} /> — pills sorted on first render
```

### Authenticated: pill click
```
Click →
  ① router.push(?category=<id>)
  ② CategoryPillBar.sessionViews[id]++  (optimistic — pill reorders immediately)
     POST /api/category-views/increment { category_id: id, delta: 1 }
       → supabase.rpc("increment_category_view", { p_user_id, p_category_id, p_delta: 1 })
         → atomic: view_count = view_count + 1
```

### Login: sync anon localStorage → DB
```
SIGNED_IN event fires (useSetUser.ts) →
  syncAnonCategoryViews():
    localViews = localStorage["23_category_views_anon"]  ← { "abc": 11 }
    POST /api/category-views/sync { views: localViews }
      → for each [id, count]: upsert with GREATEST(existing, incoming)
    localStorage.removeItem("23_category_views_anon")
```

### Logout
```
SIGNED_OUT → clearViews() → views = {}
Next page load: SSR fetches nothing (no user) → serverViews = {} → cold start order
```

---

## 5. Key files

| File | Role |
|---|---|
| `app/[locale]/(site)/page.tsx` | SSR: fetch `23_category_views`, build `serverViews`, pass as props |
| `app/[locale]/(site)/components/SortedProducts.tsx` | Auth: sort immediately from `serverViews`. Anon: read localStorage on mount |
| `app/[locale]/(site)/components/CategoryPillBar.tsx` | Pill order: `getSortedCategories(categories, mergedViews)`. Records pill click signals |
| `app/[locale]/(site)/products/[productId]/ProductDetailView.tsx` | Records product page visit signal on mount |
| `app/[locale]/(site)/components/ProductLikeButton.tsx` | Records like signal (delta 3) |
| `app/components/ui/Buttons/AddToCartButton.tsx` | Records add-to-cart signal (delta 3) |
| `app/components/Layout/hooks/useSetUser.ts` | Triggers anon→DB sync on `SIGNED_IN` |
| `app/store/categories/useCategoryPreferencesStore.ts` | `getSortedCategories` — pins FEATURED, sorts rest by views |
| `app/sdk/CategoryViewsSDK/CategoryViewsSDK.ts` | `incrementDBCategoryView`, `syncDBCategoryViews` |
| `app/api/category-views/increment/route.ts` | Accepts `delta` param, calls `increment_category_view` RPC |
| `app/api/category-views/sync/route.ts` | Merges anon views into DB with `GREATEST` logic |

---

## 6. Risks + mitigations

| Risk | Fix |
|---|---|
| CLS flash (server: seed order → client: personalized) | Auth users: `serverViews` from SSR — no flash. Anon: one flash per session on mount |
| Race condition on rapid clicks | `increment_category_view` SQL: `view_count = view_count + p_delta` — atomic |
| Stale localStorage overwriting fresher DB counts on sync | `GREATEST(db, local)` in sync route — DB count never regresses |
| FEATURED uuid unknown at sort time | `getSortedCategories` identifies by `name === 'FEATURED'`, not hard-coded uuid |
| `getSortedCategories` recalculates on every render | `useMemo([mounted, mergedViews, categories])` in CategoryPillBar |

---

## 7. TODO
- [ ] **You**: add screenshots (Supabase `23_category_views` table, product order before/after recommendation)
- [ ] Decide if subcategory clicks should count (currently only root pill clicks tracked)
- [ ] Consider adding "reset preferences" in user settings (low priority)
