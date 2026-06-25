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
// app/store/categories/useCategoryPreferencesStore.ts
interface CategoryPreferencesStore {
  views: Record<string, number>   // unused by UI directly — kept for devtools visibility
  recordView: (categoryId: string) => void   // not called from UI — views go via sessionViews state
  clearViews: () => void          // called on logout (wipes devtools state)
  hydrateFromDB: (dbViews: { category_id: string; view_count: number }[]) => void  // unused — SSR handles hydration
  getSortedCategories: (categories: TCategory[], serverViews?: Record<string, number>) => TCategory[]
  // ↑ the only method called from UI. serverViews = mergedViews from CategoryPillBar
}

// CategoryPillBar internal state
sessionViews: Record<string, number>  // optimistic local increments this session (in useState, not Zustand)
mergedViews = { ...serverViews, ...sessionViews (additive) }
// passed to getSortedCategories for immediate pill reorder on click
```

### 1.3 Data tree

```
Authenticated user:
  app/[locale]/(site)/page.tsx (SSR)
    supabase.from("23_category_views").select("category_id, view_count").eq("user_id", user.id)
    → serverViews: Record<string, number>
    → <CategoryPillBar serverViews={serverViews} />
    → <SortedProducts serverViews={serverViews} />
    sorted on first render — no hydration flash

Anonymous user:
  localStorage["23_category_views_anon"]: Record<string, number>
    → SortedProducts reads on mount → sorts client-side (one flash)
    → CategoryPillBar: pill clicks write here; sessionViews handles in-session reorder
    → cleared + upserted to DB on SIGNED_IN (useSetUser.ts)
```

### 1.4 DB table shape

```
23_category_views (Supabase):
  user_id TEXT          ← auth.uid()::text
  category_id UUID      ← FK → 23_categories.id ON DELETE CASCADE
  view_count INTEGER    ← atomic upsert, never decrements
  last_viewed_at TIMESTAMPTZ
  UNIQUE(user_id, category_id)
```

[screenshot placeholder — Supabase 23_category_views table rows]

---

## 2. Terminology

- **Signal**: user action that contributes to a category preference score.
- **Pinned**: `All` (virtual, no DB row) and `FEATURED` — always positions 1 and 2. `FEATURED` is identified by `name === "FEATURED"`, not a hard-coded UUID.
- **Floating**: any other root category — sorted by `view_count DESC`, alpha tie-break.
- **Cold start**: new user, no views. Order = seed script insertion order.
- **serverViews**: `Record<string, number>` fetched SSR for auth users. Zero-latency sort, no flash.
- **sessionViews**: `useState` in `CategoryPillBar`. Optimistic increments within the current tab session. Merged with `serverViews` for pill order.
- **anonViews**: `localStorage["23_category_views_anon"]`. Read by `SortedProducts` on mount for anonymous users.
- **Sync**: `useSetUser.ts` calls `POST /api/category-views/sync` on `SIGNED_IN` — upserts local counts with `GREATEST(db, local)`, then clears localStorage.

---

## 3. Signal weights

| Action | delta | Where recorded |
|---|---|---|
| Category pill click | 1 | `CategoryPillBar.handlePillClick` |
| Product page visit | 1 | `ProductDetailView` useEffect on mount |
| Like a product | 3 | `ProductLikeButton` onClick (only on like, not unlike) |
| Add to cart | 3 | `AddToCartButton` onClick |

Auth: calls `categoryViewsSDK.incrementDBCategoryView({ category_id, delta })` → `POST /api/category-views/increment` → `supabase.rpc("increment_category_view", { p_user_id, p_category_id, p_delta })`

Anon: writes `localStorage["23_category_views_anon"][category_id] += delta` directly.

---

## 4. ASCII flow

### Anonymous: pill click
```
Click "Electronics" →
  ① router.push(?category=<id>)
  ② sessionViews[id]++  (optimistic — pills reorder immediately in this tab)
     localStorage["23_category_views_anon"][id]++  (persisted across reloads)
```

### Anonymous: product page visit
```
ProductDetailView mounts →
  product.category_id exists →
    localStorage["23_category_views_anon"][category_id] += 1
```

### Authenticated: server-sorted on load
```
page.tsx SSR:
  supabase.from("23_category_views").select(...).eq("user_id", user.id)
  → serverViews = { "uuid-electronics": 12, "uuid-sports": 5 }
  → <SortedProducts serverViews={serverViews} />  — sorted immediately, no flash
  → <CategoryPillBar serverViews={serverViews} />  — pills sorted on first render
```

### Authenticated: pill click
```
Click →
  ① router.push(?category=<id>)
  ② sessionViews[id]++  (optimistic)
     POST /api/category-views/increment { category_id: id, delta: 1 }
       → supabase.rpc("increment_category_view", { p_user_id, p_category_id, p_delta: 1 })
           → atomic: view_count = view_count + 1
```

### Login: sync anon localStorage → DB
```
SIGNED_IN event fires (useSetUser.ts, only when previousUser.id !== nextUser.id) →
  syncAnonCategoryViews():
    raw = localStorage["23_category_views_anon"]
    POST /api/category-views/sync { views: raw }
      → for each [id, count]: upsert view_count = GREATEST(db_count, local_count)
    localStorage.removeItem("23_category_views_anon")
```

### SortedProducts sort logic
```
Auth (serverViews non-empty):
  sortByViews(products, serverViews) — runs synchronously on SSR-passed prop, no useEffect needed

Anon (serverViews empty):
  useEffect on mount → read localStorage["23_category_views_anon"] → setAnonViews → setMounted(true)
  useMemo: sortByViews(products, anonViews)  — one re-render after mount

sortByViews:
  topIds = Object.entries(views).sort by count DESC → map to id
  products sorted: topIds index ASC, then price ASC for unranked
```

---

## 5. Key files

| File | Role |
|---|---|
| `app/[locale]/(site)/page.tsx` | SSR: fetch `23_category_views`, build `serverViews`, pass as props |
| `app/[locale]/(site)/components/SortedProducts.tsx` | Auth: sort from `serverViews`. Anon: read localStorage on mount |
| `app/[locale]/(site)/components/CategoryPillBar.tsx` | Pill order via `getSortedCategories(categories, mergedViews)`. Records pill click signals |
| `app/[locale]/(site)/products/[productId]/ProductDetailView.tsx` | Records product page visit (delta 1) on mount |
| `app/[locale]/(site)/components/ProductLikeButton.tsx` | Records like signal (delta 3, only on like not unlike) |
| `app/components/ui/Buttons/AddToCartButton.tsx` | Records add-to-cart signal (delta 3) |
| `app/components/Layout/hooks/useSetUser.ts` | Triggers anon→DB sync on `SIGNED_IN` |
| `app/store/categories/useCategoryPreferencesStore.ts` | `getSortedCategories` — pins FEATURED first, sorts rest by views DESC |
| `app/sdk/CategoryViewsSDK/CategoryViewsSDK.ts` | `incrementDBCategoryView`, `syncDBCategoryViews` |
| `app/api/category-views/increment/route.ts` | Auth-gated POST — calls `increment_category_view` RPC with `p_delta` |
| `app/api/category-views/sync/route.ts` | Auth-gated POST — merges anon views with `GREATEST(db, local)` |

---

## 6. Risks + mitigations

| Risk | Fix |
|---|---|
| CLS flash (seed order → personalized) | Auth: `serverViews` from SSR — no flash. Anon: one flash per session after mount |
| Race condition on rapid clicks | `increment_category_view` SQL: `view_count = view_count + p_delta` — atomic at row level |
| Stale localStorage overwriting fresher DB counts on sync | `GREATEST(db, local)` in sync route — DB count never regresses |
| FEATURED uuid unknown at sort time | `getSortedCategories` identifies by `name === "FEATURED"`, not hard-coded UUID |
| `getSortedCategories` recalculates on every render | `useMemo([mounted, mergedViews, categories])` in `CategoryPillBar` |
| Rate limiter (Upstash) unreachable in dev | Rate limiting removed from increment route — not needed for authenticated self-increment |

---

## 7. TODO
- [ ] **You**: add screenshot — Supabase `23_category_views` table rows after a few sessions
- [ ] Decide if subcategory clicks should count (currently only root pill clicks tracked)
- [ ] Consider "reset preferences" in user settings (low priority)
