## Why I don't create separate components for Product.tsx

I want explain that I don't make separate components for Prodcut.tsx like ProductHeader.tsx / ProductFooter.tsx
Because its 3 different components

![edit product](https://i.imgur.com/JsnnKZW.png)

1. Here I made iamge smaller to improve UX because owner already know his image and I give product owner
   more space to edit product
2. I added icons to edit and speatated it into smaller components like OwnerProductForm.tsx so here it
   make sence but it not reusable anywhere else because it with icons and logic to edit product

![Product.tsx](https://i.imgur.com/ysU5kPE.png)

1. Here I made image enough big and leaved space for user to read title price description
   also size of title price increased for readability

![cart prodcut](https://i.imgur.com/v8AWraN.png)

1. Here I don't created sparated component also to impriove UX because I make accent on iamge
   and in modal cart product width smaller then Product.tsx that's why I need another but similar media queries

## Summary

Leave it as is without separated components for Product.tsx (exept edit product)

## A variant needs a label and a price — the image is optional

`image_url` is `string | null | undefined` on `TProductVariant`. Colour variants have their own photo
and render as swatches; **size** variants (S/M/L, 30x40 vs 50x70) look identical in a photo, so the
owner attaches none and they render as text chips of the same height:

```
┌──────────┐ ┌──────────┐ ┌───────┐ ┌───────┐
│ [photo]  │ │ [photo]  │ │  50x70│ │ 30x40 │
│ Blue     │ │ Black    │ │  9.90 │ │  6.90 │
└──────────┘ └──────────┘ └───────┘ └───────┘
   with image                 without image
```

Both selectors filter on the label alone (`variants.filter(variant => variant.label)` in
[Product.tsx](Product/Product.tsx) and [ProductDetailView.tsx](../products/[productId]/ProductDetailView.tsx))
and render the thumbnail only when there is one.

Wherever an image is unavoidable — cart line, Stripe/PayPal line item, order email — one helper answers:

```ts
getVariantImageUrl(product, variant) // variant image → product's first photo → /no-image-fallback.png
```

in [cartProducts.ts](../../../utils/cartProducts.ts). It runs at render time and is never written into
the stored row, so replacing the product's photos fixes every imageless variant at once.
Story: `Commerce/Product → VariantWithoutImage`.

<br/>

## Per-variant stock (sold out) in Product.tsx

Each variant has its own `quantity` (`{ id, label, image_url?, price, quantity }`). `quantity === 0`
means THAT variant is sold out — not the whole product.

What Product.tsx does with it:

1. The stock badge + the add/replenish actions follow the **selected** variant, not the product. I get the
   number from one helper so the UI and the cart agree on "sold out":
   `getAvailableStock(product, selectedVariantId)` in [cartProducts.ts](../../../utils/cartProducts.ts)
   → variant `quantity`, or product `on_stock` when the product has no variants.
2. In the variant selector a sold-out variant is dimmed (`opacity-55`) and its price is replaced by the
   `product.out_of_stock_label` text. It stays clickable on purpose (soft sold-out) so the user can select
   it and see "request replenishment".
3. When the selected variant is sold out, `isOutOfStock` is true → the row swaps the add buttons for
   `RequestReplanishmentButton`, same as a product-level out-of-stock.

The cart side is guarded too — `cartStore.increaseProductQuantity` won't add a sold-out variant and
`getProductsPrice` skips sold-out lines. Full data flow + the "manual only, no auto-decrement" decision
live in [AdminPanel/dev_readme-adminPanel.md](../../../components/ui/Modals/AdminPanel/dev_readme-adminPanel.md).

<br/>

## Request replenishment (sold-out product)

`RequestReplanishmentButton` ([Product/RequestReplanishmentButton.tsx](../../../components/Product/RequestReplanishmentButton.tsx))
does three things on one click, in this order:

```
click "Request replenishment"
  -> renderAsync(<RequestReplanishmentEmail product={...} />)      html for the email body
  -> emailsSDK.sendRequestReplanishmentEmail({ owner_id, html })   owner gets the email
  -> productsSDK.updateDBReplanishmentRequests({ product_id })     23_products.replanishment_requests_count + 1
  -> toast "You requested replenishment" + the new count on the button
```

Why the render sits in the click handler and not in an effect: an effect that renders into state shipped
an empty email body for months (see [emails/dev_readme.md](../../../emails/dev_readme.md)).

The counter is one INTEGER column on the product, raised through
`increment_product_replanishment_requests` so two buyers clicking at the same second both count. The
column + function SQL is in [dev_readme-supbase-sql.md](../../../../dev_readme-supbase-sql.md) under
"REPLENISHMENT REQUESTS" - it has to be run once in Supabase before the number moves.
