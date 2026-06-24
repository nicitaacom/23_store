# Categories System

## Style references
- Code patterns: `public/docs/AI_readme_code-sytle-patterns.md`
- UI tokens + breakpoints: `public/docs/UI_PROJECT_STYLE.md` and `tailwind.config.ts`
- Only token colors: `background`, `foreground`, `title`, `subTitle`, `border-color`, `success`, `success-accent`
- Only custom breakpoints: `mobile:` `tablet:` `laptop:` `desktop:` — never `sm:` `md:` `lg:` `xl:`

---

## 0. Why this exists

Products had no grouping. Buyers could not browse by type. The categories system adds a two-level hierarchy (parents → subcategories), a horizontal pill bar on the catalog page for filtering, admin CRUD, AI auto-assign at product creation time, and a one-time backfill for existing products.

---

## 1. How does it look like?

### 1.1 UI + component paths

[screenshot placeholder — add after implementation]

- **Pill bar**: `app/[locale]/(site)/components/CategoryPillBar.tsx`
- **Admin CRUD**: `app/components/ui/Modals/AdminPanel/components/CategoriesForm.tsx`
- **Per-product edit**: `app/components/ui/Modals/AdminPanel/components/FormatCategoryForm.tsx`
- **Add product AI assign**: `app/components/ui/Modals/AdminPanel/components/AddProductForm.tsx`

### 1.2 Types

```ts
// app/ts/categories/TCategory.ts
type TCategory = { id: string; name: string; parent_id: string | null }

// app/ts/product/TProductDB.ts (added field)
type TProductDB = { ..., category_id?: string | null }
```

### 1.3 Data tree

```
Supabase: 23_categories (400+ rows)
  └─ 23_products.category_id (FK, ON DELETE SET NULL)

Server: page.tsx fetchCategories() → fetchProducts(categoryIds?)
                                          │
                         passed as props to CategoryPillBar
                                          │
                    User clicks pill → ?category=<uuid> → page refetch
                                          │
                         .in("category_id", [parentId, ...childIds])
```

### 1.4 Store shape

```
useCategoriesStore (in-memory, no persistence)
{
  categories: TCategory[],
  hydrate(categories),
  addCategory(category),
  updateCategory(id, next),
  removeCategory(id)
}
```

[screenshot placeholder — Zustand devtools after implementation]
[screenshot placeholder — Supabase 23_categories table rows]

---

## 2. Terminology

- **Parent category** — root-level group (Beauty & Health, Electronics, …). `parent_id = NULL`.
- **Subcategory** — child of a parent (Hair Care under Beauty & Health). Has `parent_id`.
- **FEATURED** — special root category. Admin manually assigns `category_id = featuredId` to highlight products.
- **Auto-assign** — gpt-5-nano picks `category_id` based on the product title + description when admin types in AddProductForm (800ms debounce, ≥10 chars).
- **Backfill** — one-time admin action that loops all products with `category_id IS NULL` and assigns them via gpt-5-nano.

---

## 3. ASCII flow

### Catalog browse
```
User clicks "Beauty & Health" pill
→ router.push(?category=<beautyId>)
→ page.tsx: childIds = categories.filter(c => c.parent_id === beautyId).map(c => c.id)
→ fetchProducts([beautyId, hairCareId, makeupId, ...])
→ supabase .in("category_id", categoryIds)
→ only matching products shown
```

### Product creation (AI auto-assign)
```
Admin types title (≥10 chars, debounced 800ms)
→ aiSDK.suggestCategory({ title, description })
  → POST /api/ai/suggest-category
    → selectDBCategories() → gpt-5-nano (temperature:0, max_tokens:40)
      → returns UUID or "null"
        → validate UUID + check it's a known category ID
          → setCategoryId() + setAutoAssignedName()
            → badge shown: "Auto-assigned: Hair Care" [×]
              → Admin can clear or override via dropdown
                → category_id stored in createProductFn → translateAndInsertInDB
```

### Admin CRUD
```
AdminPanel → Categories tab → CategoriesForm
  Add:    POST /api/categories/insert → useCategoriesStore.addCategory()
  Edit:   PATCH /api/categories/update → useCategoriesStore.updateCategory()
  Delete: GET /api/categories/count (show warning: "N products affected")
          DELETE /api/categories/delete → useCategoriesStore.removeCategory()
          DB ON DELETE SET NULL cascades to 23_products.category_id
```

### Backfill (one-time)
```
Admin opens Categories tab → sees "X products have no category"
→ clicks "Assign categories" button
  → POST /api/admin/backfill-categories (ADMIN only)
    → fetches all categories once
    → loops products with category_id IS NULL, 150ms delay between calls
    → gpt-5-nano assigns each
    → supabaseAdmin updates rows
      → returns { processed: N, failed: [...] }
        → DELETE route file + button after successful run
```

---

## 4. Deployment order

1. Run migration SQL in Supabase SQL editor:
   ```sql
   CREATE TABLE IF NOT EXISTS public."23_categories" (...);
   ALTER TABLE public."23_products" ADD COLUMN IF NOT EXISTS category_id UUID NULL REFERENCES ...;
   CREATE INDEX IF NOT EXISTS idx_23_products_category_id ON public."23_products"(category_id);
   ```
2. Run seed: `pnpm tsx scripts/seedCategories.ts`
3. Deploy code
4. Open AdminPanel → Categories → click "Assign categories to N unassigned products"
5. Delete `app/api/admin/backfill-categories/route.ts` + the backfill button in `CategoriesForm.tsx`

---

## 5. TODO
- [ ] **You**: add screenshots for section 1.1 (CategoryPillBar UI) and 1.4 (Supabase 23_categories rows, Zustand devtools)
- [ ] After backfill run: delete `app/api/admin/backfill-categories/route.ts` and the backfill button in `CategoriesForm.tsx`
- [ ] If a subcategory needs multiple parents, migrate to a many-to-many join table (name UNIQUE constraint prevents this now)
- [ ] Wire `useSupportPrefilledMessage` into `SupportButton`'s `MessageInput.tsx` — on mount, read `message`, set as `defaultValue`, call `clear()`
