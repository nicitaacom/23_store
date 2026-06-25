# AI Suggest Category

## 0. Why this exists

When an admin creates a product they'd have to manually pick a category from a dropdown. This feature auto-assigns the best-fit category by sending the product title (and optional description) to GPT and getting back a category UUID.

---

## 1. How does it look like?

### 1.1 UI + file paths

- Label "AI suggesting…" (animated pulse) appears next to the Category label while loading
- Green badge "Auto-assigned: <CategoryName> ×" appears when assigned — the × lets the admin clear it
- Component: `app/components/ui/Modals/AdminPanel/components/AddProductForm.tsx` (lines ~790-817)

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
  │  useEffect — debounce 800ms, skip if same key as last call
  │
  ▼
aiSDK.suggestCategory()          ← app/sdk/AISDK/AISDK.ts
  │
  ▼
POST /api/ai/suggest-category    ← app/api/ai/suggest-category/route.ts
  │  rate-limit: 10 req/min per IP (Upstash Redis)
  │  fetches all categories from DB
  │  calls gpt-5-nano with system prompt listing id→name
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
| `suggestKey` | `"${trimmedTitle}::${trimmedDescription}"` — deduplication key stored in `lastSuggestedKeyRef` |
| auto-assigned | Category set by AI, shown with green badge; user can override via dropdown or clear with × |
| rate limit | 10 calls/min per IP via Upstash fixed window — key: `ai:suggest-category:<ip>` |

---

## 3. How it works

```
User types title (≥10 chars)
      │
      ▼ 800ms debounce
   same suggestKey as last call?
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
- Before scheduling the timeout, compute `key = "${trimmed}::${description}"` and early-return if `lastSuggestedKeyRef.current === key`
- Set `lastSuggestedKeyRef.current = key` at the start of the timeout callback
- Reset to `null` in `clearForm()`

---

## 5. TODO

- [ ] Trigger suggest again if user manually changes the dropdown (currently once auto-assigned, changing title won't re-assign unless the key differs)
