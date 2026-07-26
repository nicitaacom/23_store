# AI Suggest Category

## 0. Why this exists

When an admin creates a product they'd have to manually pick a category from a dropdown. This feature auto-assigns the best-fit category by sending the product title (and optional description) to GPT and getting back a category UUID.

---

## 1. How does it look like?

### 1.1 UI + file paths

- Label "AI suggesting…" (animated pulse) appears next to the Category label while loading
- Green badge "Auto-assigned: <CategoryName> ×" appears when assigned — the × lets the admin clear it
- Component: `app/components/ui/Modals/AdminPanel/components/AddProductForm.tsx` (lines ~821-840)

### 1.2 Types

```ts
// app/ts/namespaces/api/category-views/api.d.ts
type AISuggestCategoryRequest  = { title: string }
type AISuggestCategoryResponse = { category_id: string | null } | { error: string }
```

### 1.3 Data flow (ASCII)

```
AddProductForm (client)
  │  titleValue / descriptionValue change
  │  useEffect — debounce 800ms, skip if same trimmed title as lastSuggestedKeyRef or categoryId already set
  │
  ▼
aiSDK.suggestCategory()          ← app/sdk/AISDK/AISDK.ts
  │
  ▼
POST /api/ai/suggest-category    ← app/api/ai/suggest-category/route.ts
  │  rate-limit: 10 req/min per IP (Upstash Redis)
  │  fetches all categories from DB
  │  calls gpt-5-nano with system prompt listing name=id (max_completion_tokens: 2000 — lower values cause "null" responses)
  │  title only — description deliberately excluded (token waste; title is sufficient)
  │  returns { category_id: UUID | null }
  │
  ▼
AddProductForm
  setCategoryId(result.category_id)
  setAutoAssignedName(found.name)
```

---

## 2. Terminology

| Term | Meaning |
|---|---|
| `suggestKey` | trimmed title string — deduplication key stored in `lastSuggestedKeyRef`; description is excluded |
| auto-assigned | Category set by AI, shown with green badge; user can override via dropdown or clear with × |
| rate limit | 10 calls/min per IP via Upstash fixed window — key: `ai:suggest-category:<ip>` |

---

## 3. How it works

```
User types title (≥10 chars) AND no categoryId already set
      │
      ▼ 800ms debounce (suggestDebounceRef clears on re-render)
   same trimmed title as lastSuggestedKeyRef?
      │ yes → skip (prevents double-fire when allCategories loads after title)
      │ no  → call API
      ▼
   AI returns UUID or null
      │ UUID in allCategories → setCategoryId + setAutoAssignedName
      │ null / unknown UUID   → no-op (keep existing selection)
```

The `lastSuggestedKeyRef` is reset to `null` in `clearForm()` so the next product creation starts fresh.

---

## 4. Double-fire bug (fixed)

**Root cause**: `useEffect` deps included `allCategories`. If categories were not yet loaded when the title reached ≥10 chars, the effect returned early (`if (!allCategories.length) return`). When categories loaded, `allCategories` changed → effect re-ran → a second API call fired for the same title.

**Fix** (`AddProductForm.tsx`):
- Added `lastSuggestedKeyRef = useRef<string | null>(null)`
- Before scheduling the timeout, early-return if `lastSuggestedKeyRef.current === trimmed`
- Set `lastSuggestedKeyRef.current = trimmed` at the start of `runSuggestCategory`
- Reset to `null` in `clearForm()`

---

## 4.1 Re-suggest after a manual pick

A title edit that happens AFTER the admin picked a category by hand re-runs the suggest, even when the
debounce key matches the previous one. Picking a category never triggers a suggest on its own, so the
dropdown never fights the admin mid-pick.

```
title typed        -> AI assigns "Toys"
admin picks "Home" -> manualCategoryPickRef = true   (no suggest runs)
admin edits title  -> title changed + manual pick    -> suggest runs again, dropdown updates
admin edits title  -> title changed, no manual pick  -> key check applies as before
```

Refs in `AddProductForm.tsx`: `manualCategoryPickRef` (set in `CategoryDropdown.onChange`, cleared when
the debounced suggest fires) and `lastSuggestedTitleRef` (tells a title edit apart from a `categoryId`
change, since both re-run the effect). Both reset in `clearForm()`.

---

## 5. TODO

- [x] Trigger suggest again if user manually changes the dropdown (currently once auto-assigned, changing title won't re-assign unless the key differs)
