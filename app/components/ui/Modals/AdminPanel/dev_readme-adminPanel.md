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

## 4. TODO / decided against

- **AGAINST: auto-decrement variant stock on purchase.** Chosen manual-only to keep the checkout path
  unchanged and avoid race conditions / refunds re-incrementing. The old checkout-time
  `.filter(product => product.on_stock > 0)` stays commented out in
  [PayWithClarnaButton.tsx](../CartModal/PaymentButtons/components/PayWithClarnaButton.tsx) on purpose.
- **AGAINST: hiding sold-out variants.** Soft sold-out — the variant stays visible (dimmed + labelled)
  so the customer can see it exists and use "request replenishment".
- TODO (if ever needed): show remaining stock count next to each in-stock variant in the selector
  (today only the price is shown for in-stock variants).
