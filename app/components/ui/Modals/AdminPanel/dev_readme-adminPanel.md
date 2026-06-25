# Admin Panel modal

## 0. Why this exists

The owner needs ONE place to add a product, edit an existing product, and delete a product — without
leaving the page. The Admin Panel is that place. It opens as a query-param modal (`?modal=AdminPanel`)
so it survives refresh and is shareable, and it is gated to the `admin` role.

A second reason this doc exists: variants used to render **without images** and there was **no way to
edit a variant** after creating it (Edit tab had title/price/stock/images but not variants). That is
fixed — see [VariantsForm.tsx](components/VariantsForm.tsx) and the per-variant stock section below.

## 1. How does it look like?

### 1.1 UI + file pathnames

- Modal shell — [AdminPanelModal.tsx](AdminPanelModal.tsx)
- Tab header (Add / Edit / Delete) — [components/AdminPanelHeader.tsx](components/AdminPanelHeader.tsx)
- Add tab — [components/AddProductForm.tsx](components/AddProductForm.tsx)
- Edit tab — [components/EditProductForm.tsx](components/EditProductForm.tsx) → renders one
  [components/OwnerProduct.tsx](components/OwnerProduct.tsx) per product, which composes the
  `Format*Form` editors (title / description / price / on-stock / images) **and**
  [components/VariantsForm.tsx](components/VariantsForm.tsx)
- Delete tab — [components/DeleteProductForm.tsx](components/DeleteProductForm.tsx) +
  [components/AdminPanelDeleteConfirmDialog.tsx](components/AdminPanelDeleteConfirmDialog.tsx)

### 1.2 Types

- `TProductDB` — [app/ts/product/TProductDB.ts](../../../../ts/product/TProductDB.ts)
- `TProductVariant` (`{ id, label, image_url, price, quantity }`) and `TProductVariantDraft`
  — [app/ts/product/TProductVariant.ts](../../../../ts/product/TProductVariant.ts)
- API request/response (`ProductsVariant`, `ProductsUpdateRequest`)
  — [app/ts/namespaces/api/products/api.d.ts](../../../../ts/namespaces/api/products/api.d.ts)

### 1.3 Where the data lives (ASCII)

```
Supabase 23_products (variants JSONB)        app/store/user/ownerProductsStore.ts
        │                                              │ (hydrate / replaceProduct)
        ▼                                              ▼
   normalizeProduct()  ──────────────────────►  AdminPanelModal
   app/utils/productVariants.ts                        │
        (backfills variant.quantity                    ├─ Add  → AddProductForm
         from on_stock for legacy rows)                ├─ Edit → EditProductForm → OwnerProduct → VariantsForm
                                                        └─ Delete → DeleteProductForm
```

Save path (Edit a variant):

```
VariantsForm.handleSave()
  → productsSDK.updateProduct({ productId, variants })   // string return = error
  → POST /api/products/update  (variants branch)
       → normalizeProductVariants(variants, price, on_stock)
       → supabase.update({ variants })
  → replaceProduct(id, response.product)                 // ownerProductsStore re-syncs drafts
```

## 2. Terminology

- **Variant** — a sellable variation of a product (e.g. a colour). Stored in the `variants` JSONB array
  as `{ id, label, image_url, price, quantity }`. `price` is a per-variant override; `quantity` is
  per-variant stock.
- **Draft** — the form's local editable copy of a variant while typing. Prices/quantities are kept as
  formatted input strings (`priceInput`, `quantityInput`) and only resolved to numbers on save.
- **Dirty** — a draft differs from what is persisted. `VariantsForm` compares `signature(drafts)` to the
  persisted signature; the Save button only shows when dirty.
- **Sold out** — `quantity === 0`. Manual only (see §3).

## 3. Per-variant stock (sold-out)

Decision made: **per-variant `quantity`, manual only.** The owner sets the stock number per variant;
nothing decrements it automatically on purchase. `quantity === 0` means that one variant is sold out —
it does NOT take down the whole product, only that variant.

```
variant.quantity = 3   →  "3 units", addable
variant.quantity = 0   →  badge "Out of stock", dimmed in the selector, add blocked
```

How it flows end to end:

1. **Add** ([AddProductForm.tsx](components/AddProductForm.tsx)) — a stock input sits next to the price
   input. Empty/invalid = `0` (sold out). The owner can restock later in the Edit tab.
2. **Edit** ([VariantsForm.tsx](components/VariantsForm.tsx) and the standalone
   [manage view](../../../../[locale]/(site)/products/[productId]/manage/ManageProductView.tsx)) — each
   variant row has a stock input + a sold-out badge / warning border.
3. **Normalize** ([productVariants.ts](../../../../utils/productVariants.ts)) — legacy variants that
   predate `quantity` inherit the product's `on_stock` so they are NOT shown sold out by mistake.
4. **Customer** ([Product.tsx](../../../../[locale]/(site)/components/Product/Product.tsx)) — the stock
   badge + add/replenish actions reflect the **selected** variant's stock via
   `getAvailableStock()` ([cartProducts.ts](../../../../utils/cartProducts.ts)).
5. **Cart guard** ([cartStore.ts](../../../../store/user/cartStore.ts)) — `increaseProductQuantity`
   refuses a sold-out variant; `getProductsPrice` excludes sold-out lines.

## 3a. `on_stock` = SUM of variant quantities (auto-computed)

### The rule

For a product **with variants**, `on_stock` is **not typed by a human**. It is the **sum of every
variant's `quantity`**. A separate product-level total would just contradict the per-variant counts
("variant says 25, product says 1000"), so there is no on_stock input anymore when variants exist.

```
variants = [ { label: "Blueberry", quantity: 25 },
             { label: "Cherry",    quantity: 10 },
             { label: "Lime",      quantity:  0 } ]    ← sold out

on_stock = 25 + 10 + 0 = 35     (computed, never typed)
```

A product **without** variants still uses its own manually-entered `on_stock`.

### What keeps it updated — the functions

`on_stock` is recomputed every time the variants are saved. You never write `on_stock` by hand when there
are variants; these functions do it for you:

| When | Function that recomputes `on_stock` | What it does |
|---|---|---|
| Owner saves variants (Edit tab / Manage page) | **`POST /api/products/update`** variants branch — [route.ts](../../../../api/products/update/route.ts) | `on_stock = normalizedVariants.reduce((sum, v) => sum + v.quantity, 0)` and writes it to the row. **This is the source of truth.** |
| Owner creates a product | **`onSubmit`** in [AddProductForm.tsx](components/AddProductForm.tsx) | `on_stock = optimisticVariants.reduce((sum, v) => sum + v.quantity, 0)` before insert |
| Live preview while editing | the `totalStock` sum in [AddProductForm.tsx](components/AddProductForm.tsx) / [ManageProductView.tsx](../../../../[locale]/(site)/products/[productId]/manage/ManageProductView.tsx) | shows the running sum so the owner sees it update as they type each variant's stock |

So: edit any variant's `quantity` → save → the **update route** re-sums and stores the new `on_stock`.
Nothing else touches it. (No DB trigger today — the recompute lives in the API route. If you ever write
variants from another path, recompute there too, or move this into a Postgres trigger on `23_products`.)

### Where the input is hidden / read-only

- **Add** ([AddProductForm.tsx](components/AddProductForm.tsx)) — no on_stock input at all; preview shows the sum.
- **Edit tab** ([FormatOnStockForm.tsx](components/FormatOnStockForm.tsx)) — read-only total when the product
  has variants (`isDerivedFromVariants`, passed from [OwnerProduct](components/OwnerProduct.tsx)); editable only
  for variantless products.
- **Manage page** ([ManageProductView.tsx](../../../../[locale]/(site)/products/[productId]/manage/ManageProductView.tsx))
  — read-only live total; the separate on_stock update call was removed (saving variants recomputes it).

## 3b. Header: why `data-click-outside-ignore`

[AdminPanelHeader.tsx](components/AdminPanelHeader.tsx) carries `data-click-outside-ignore` so clicking dead
space between the underline tabs doesn't trip the modal's click-outside handler and close it. The header is
[OrganicCanvasBackground](../../../OrganicCanvasBackground.tsx), which now forwards DOM props so the attribute
reaches its root div. Tabs are flat underline-style with a unified brand accent + `FiPlus` on Add.

## 3b. FormatTitleForm — inline edit pattern

[components/FormatTitleForm.tsx](components/FormatTitleForm.tsx)

- Click pencil/row → shows input with **Save / Cancel** buttons
- **Enter** → native form submit (no document keydown handler needed — input is inside `<form>`)
- **Escape** → cancel via document `keydown` listener (capture phase, `isEditingRef` guards it)
- **Click outside** → `handleInputBlur` with 150ms delay checks `containerRef.contains(activeElement)` — cancels if focus left
- **Save** → calls `productsSDK.translateField({ field: "title", ... })` — translates to all 4 locales
- **AGAINST onBlur auto-save**: RHF `register()` always calls its own `onBlur` which triggers field validation regardless of form `mode`. Showed "required" error just from clicking the input. Fixed by Cancel-on-blur instead of save-on-blur.

## 3c. FormatDescriptionForm — inline edit pattern

[components/FormatDescriptionForm.tsx](components/FormatDescriptionForm.tsx)

- Click row → shows `MarkdownEditor` + `RichTextToolbar` + **Save / Cancel** buttons
- **Save** → `productsSDK.translateField({ field: "description", ... })` — translates all 4 locales
- **Cancel** → resets value to `currentTranslation.description`, closes edit mode
- **AGAINST onBlur auto-save**: Tiptap's paste handling briefly blurs the editor → old `onBlur={handleSave}` closed edit mode mid-paste. Removed entirely.
- **AGAINST Enter-to-save for description**: multiline text editor — Enter inserts a new line. Save button is the only save trigger (works on tablets too).
- `valueRef.current = value` pattern used so `handleSave` always reads latest value (avoids stale closure from async handlers).

## 3d. OwnerProduct — group hover scope

[components/OwnerProduct.tsx](components/OwnerProduct.tsx)

`group` class is on the **image container div** only, not the `<article>`. This ensures `group-hover:opacity-100` on the image nav arrows only fires when hovering over the image — not when hovering over the description editor or variants section below.

```
<article>                          ← NO group here
  <div className="group ...">      ← group scoped to image column only
    <OwnerProductImageSlider />    ← nav arrows use group-hover:opacity-100
  </div>
  <div>                            ← hover here does NOT trigger image arrows
    <FormatDescriptionForm />
    ...
  </div>
</article>
```

## 4. TODO / decided against

- **AGAINST: auto-decrement variant stock on purchase.** Chosen manual-only to keep the checkout path
  unchanged and avoid race conditions / refunds re-incrementing. The old checkout-time
  `.filter(product => product.on_stock > 0)` stays commented out in
  [PayWithClarnaButton.tsx](../CartModal/PaymentButtons/components/PayWithClarnaButton.tsx) on purpose.
- **AGAINST: hiding sold-out variants.** Soft sold-out — the variant stays visible (dimmed + labelled)
  so the customer can see it exists and use "request replenishment".
- TODO (if ever needed): show remaining stock count next to each in-stock variant in the selector
  (today only the price is shown for in-stock variants).
