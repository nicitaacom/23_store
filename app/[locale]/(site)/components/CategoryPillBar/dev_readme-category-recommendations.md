# Category Recommendation System

## Style references
- Code patterns: `public/docs/AI_readme_code-sytle-patterns.md`
- UI tokens + breakpoints: `public/docs/UI_PROJECT_STYLE.md` and `tailwind.config.ts`
- Only token colors: `background`, `foreground`, `title`, `subTitle`, `border-color`, `success`, `success-accent`
- Only custom breakpoints: `mobile:` `tablet:` `laptop:` `desktop:` — never `sm:` `md:` `lg:` `xl:`

---

## 0. Why this exists

Every user used to see 34 parent-category pills in the same fixed order. A user who shops Beauty & Health daily still had to scroll past Automotive and Musical Instruments. This system re-orders pills by click count so the user's most-used categories stay at the front.

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

### 1.2 Types

```ts
// app/ts/categories/TCategoryView.ts
type TCategoryView = {
  category_id: string
  view_count: number
  last_viewed_at: string
}
```

```ts
// store shape — app/store/categories/useCategoryPreferencesStore.ts
type CategoryPreferencesStore = {
  views: Record<string, number>          // categoryId → viewCount
  recordView: (categoryId: string) => void
  clearViews: () => void
  hydrateFromDB: (dbViews: TCategoryView[]) => void
  getSortedCategories: (categories: TCategory[]) => TCategory[]
}
```

### 1.3 Data tree

```
Authenticated user:
  23_category_views (Supabase DB)
    ↓ fetched on mount by useCategoryPreferences hook
    ↓ useCategoryPreferencesStore.hydrateFromDB(views)
    ↓ getSortedCategories() → sorted pill order

Anonymous user:
  localStorage key: "23_category_views"
    ↓ useCategoryPreferencesStore (Zustand persist middleware)
    ↓ getSortedCategories() → sorted pill order
```

### 1.4 Store shape

```
useCategoryPreferencesStore (persisted key "23_category_views"):
{
  views: {
    "uuid-electronics":      12,
    "uuid-sports-outdoors":   3,
    "uuid-beauty-health":     1
  }
}
```

[screenshot placeholder — Zustand devtools showing views record]
[screenshot placeholder — Supabase 23_category_views table rows]

---

## 2. Terminology

- **View**: one intentional pill click. Not a product page view.
- **Pinned**: `All` (virtual) and `FEATURED` — always positions 1 and 2.
- **Floating**: any other root category — sorted by `view_count DESC`, alpha tie-break.
- **Cold start**: new user, no views. Order = seed script insertion order.
- **Local views**: `localStorage` counts for anonymous users.
- **DB views**: `23_category_views` rows — source of truth for authenticated users.
- **Sync**: merging local views into DB on login using `GREATEST(db, local)`.

---

## 3. ASCII flow

### Anonymous: cold start
```
User lands → useCategoryPreferences mounts →
  localStorage empty → getSortedCategories: no views → seed order
  [ All ] [ FEATURED ] [ Beauty & Health ] [ Food & Grocery ] ...
```

### Anonymous: clicks Electronics
```
Click "Electronics" →
  ① router.push(?category=<id>)
  ② recordView(id)
      → views[id]++ in localStorage only (no API call for anon)
Next render:
  getSortedCategories: Electronics(1) > others(0)
  [ All ] [ FEATURED ] [ Electronics ] [ Beauty & Health ] ...
```

### Login: sync local → DB
```
Login success →
  localViews = localStorage["23_category_views"]   ← { "abc": 11 }
  POST /api/category-views/sync { views: localViews }
    → for each [id, count]: upsert with GREATEST(existing_db_count, count)
  localStorage["23_category_views"] = {}
  useCategoryPreferencesStore.clearViews()
  fetch fresh DB views → hydrateFromDB()
```

### Authenticated: clicks pill
```
Click →
  ① router.push(?category=<id>)
  ② recordView(id):
      POST /api/category-views/increment { category_id: id }
      → supabase.rpc("increment_category_view", { p_user_id, p_category_id })
        → atomic INSERT ... ON CONFLICT DO UPDATE SET view_count = view_count + 1
      → views[id]++ locally (optimistic, no rollback needed)
```

### Logout
```
Logout → clearViews() → views = {} → localStorage cleared
Next page load: cold start (seed order)
```

---

## 4. Risks + mitigations

| Risk | Fix |
|---|---|
| CLS flash (server: seed order → client: personalized order) | `mounted` guard in CategoryPillBar — renders seed order until hydrated |
| Race condition on rapid clicks (lost increments) | `increment_category_view` SQL uses `view_count = view_count + 1` — atomic |
| Stale localStorage overwriting fresher DB counts on sync | `GREATEST(db, local)` — DB count never regresses |
| FEATURED uuid unknown at sort time | Identify by `name === 'FEATURED'`, not hard-coded uuid |
| `getSortedCategories` recalculates on every render | `useMemo([views, categories])` in CategoryPillBar |

---

## 5. TODO
- [ ] **You**: add screenshots for 1.4 (Zustand devtools `views` object, Supabase `23_category_views` table)
- [ ] Wire `clearViews()` into logout flow (check `app/components/Navbar` or auth action)
- [ ] Wire `POST /api/category-views/sync` into login success callback
- [ ] Decide if subcategory clicks should count (currently only root pill clicks tracked)
