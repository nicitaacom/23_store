# plan-14 — variant image becomes optional

**Priority:** P2
**Screenshot:** the colour swatches on a product page ("Color: Blue 3 Handle+3 Blades") — that look stays for variants that HAVE an image
**Recommended model:** Sonnet · medium thinking — one required field turns optional across create, edit, render and checkout; the care point is the fallback chain, not the logic
**Status:** see [plan-00-tracker.md](plan-00-tracker.md)
**Depends on:** —

## §0 Why

A variant today is only real if it has its own image. `image_url` is a required `string` on
`TProductVariant`, and every layer enforces it:

- `app/utils/productVariants.ts:24` — `isProductVariant` drops any variant whose `image_url` is not a
  string, so a variant without one never survives `normalizeProduct`.
- `app/[locale]/(site)/products/[productId]/ProductDetailView.tsx:40` and
  `app/[locale]/(site)/components/Product/Product.tsx:45` — `.filter(variant => variant.label && variant.image_url)`,
  so an imageless variant is invisible on both the row and the product page.
- `app/api/products/translate-insert/route.ts:66` — `!variant.image_url?.trim()` makes the whole create
  request invalid.
- `app/components/ui/Modals/AdminPanel/components/AddProductForm.tsx:520` — a new variant takes
  `images[activeImageIndex].data_url`, so "Add variant" needs an uploaded image first.

That is wrong for the common case: **size** variants (S/M/L, 30x40 vs 50x70) look identical in a photo.
The owner is forced to attach the same picture to every one of them just to make them exist.

After this plan: a variant needs a **label and a price**. An image is a bonus that turns the selector
into swatches; without one the variant is a text chip and the product's first image is used wherever an
image is unavoidable (cart line, Stripe line item, order email).

## §1 Where it lives

| Piece | File |
| --- | --- |
| Type | `app/ts/product/TProductVariant.ts` (`image_url: string` → `image_url?: string \| null`, same for `imageDataUrl` on the draft) |
| Validation + normalization | `app/utils/productVariants.ts` (`isProductVariant`, `normalizeProductVariants`) |
| Create validation | `app/api/products/translate-insert/route.ts:60-72` |
| Create form | `app/components/ui/Modals/AdminPanel/components/AddProductForm.tsx:383-394, 520, 938-939` |
| Edit forms | `app/components/ui/Modals/AdminPanel/components/VariantsForm.tsx`, `.../FormatImagesForm.tsx:114-120` |
| Manage page | `app/[locale]/(site)/products/[productId]/manage/ManageProductView.tsx:37-40, 119, 175, 191, 320` |
| Buyer render | `ProductDetailView.tsx:40,112`, `Product/Product.tsx:45,144` |
| Image fallback helper | `app/utils/product.ts` → `getProductGalleryImages` |
| Cart line image | `app/store/user/cartStore.ts` (`selectedVariant?.image_url`) |
| Checkout + email | `PaymentButtons/functions/buildStripeLineName.ts`, `PayWithStripeButton.tsx:27`, `app/emails/CheckEmail.tsx:118` |
| Personalization | `app/utils/printMetrics.ts` — `variantConfigs` keys are variant ids, unaffected |

## §2 One helper, used everywhere

```ts
// app/utils/cartProducts.ts
export function getVariantImageUrl(product: Pick<TProductDB, "img_url">, variant?: TProductVariant | null) {
  return variant?.image_url || product.img_url[0] || "/no-image-fallback.png"
}
```

Every `selectedVariant?.image_url || product.img_url[0]` in the repo becomes this call, so the fallback
chain lives in one place instead of five.

## §3 Expected behavior

```
BEFORE                                   AFTER
variant without an image                 variant without an image
  -> dropped by isProductVariant ✗         -> kept: label + price + stock is enough ✓
  -> invisible in the selector ✗           -> shown as a text chip in the selector ✓
  -> create request rejected ✗             -> created ✓

variant WITH an image                    variant WITH an image
  -> swatch with a thumbnail ✓             -> unchanged, still a swatch ✓

mixed product (2 with, 1 without)        mixed product
  -> the imageless one is missing ✗        -> swatches and chips side by side ✓

cart line / Stripe / order email         cart line / Stripe / order email
  -> variant image                         -> variant image, else the product's first image ✓
```

Selector layout when a product mixes both:

```
┌──────────┐ ┌──────────┐ ┌───────┐ ┌───────┐
│ [photo]  │ │ [photo]  │ │  50x70│ │ 30x40 │
│ Blue     │ │ Black    │ │  9.90 │ │  6.90 │
└──────────┘ └──────────┘ └───────┘ └───────┘
   with image                 without image
```

## §4 Steps

> ONE TASK AT A TIME. Do task N, then STOP — show Nikita the diff and wait for his review.

1. **Type + normalization.** `image_url?: string | null` on `TProductVariant`, `imageDataUrl?: string | null`
   on `TProductVariantDraft`. In `isProductVariant` accept a missing/empty `image_url`; in
   `normalizeProductVariants` coerce `""` to `null` so "no image" has one shape. Add `getVariantImageUrl`
   to `app/utils/cartProducts.ts`. STOP — show Nikita the diff.
2. **Stop hiding imageless variants.** Both `.filter(variant => variant.label && variant.image_url)` calls
   become `.filter(variant => variant.label)`. In the two selectors render the thumbnail only when the
   variant has one, and give the imageless chip the same height so the row does not jump. STOP.
3. **Create + edit paths.** Drop the `image_url` check from `translate-insert/route.ts`; let "Add variant"
   in `AddProductForm` work with no image selected (the image picker becomes "attach an image (optional)");
   `VariantsForm` and `ManageProductView` keep an empty image instead of falling back to `img_url[0]` at
   write time — the fallback belongs at render time, not in the stored row. STOP.
4. **Fallback everywhere an image is unavoidable.** Replace the five `selectedVariant?.image_url || …`
   spots (cart store, Stripe line, PayPal line, `CheckEmail.tsx`, `ProductImage`) with `getVariantImageUrl`.
   STOP.
5. **Stories + docs.** A `Commerce/Product` story with three variants (two with images, one without) that
   asserts all three are selectable; update `app/[locale]/(site)/components/dev_readme.md` (variant section)
   and `app/components/ui/Modals/AdminPanel/dev_readme-adminPanel.md`. STOP.

## Decisions made (do not re-open)

- **No DB migration.** `variants` is JSONB; an absent `image_url` key is already valid storage. Existing
  rows keep working untouched.
- **The fallback lives at render time**, never written into the row — so replacing the product's photos
  later automatically fixes every imageless variant.
- **Imageless variants are text chips, not a placeholder image.** A grey box pretending to be a photo is
  worse than a clean label.
- **The variant id stays the key** for `personalization.variantConfigs`, so per-variant print sizes keep
  working for imageless variants.

## Code patterns to follow

- `dev_readme-code-patterns.md` — rule 13 (no 1-letter names), the verb table for any new helper.
- `good-bad-examples.md` — `<fnName>Resp` naming, no vague `data`.
- `app/[locale]/(site)/components/dev_readme.md` — the variant/stock section this plan updates.

Read them BEFORE coding; validate the final diff line-by-line before saying done.

➡️ Next plan: — (back to [plan-00-tracker.md](plan-00-tracker.md))
