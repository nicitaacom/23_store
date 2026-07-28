# Personalize a product

## 0. Why this exists

A buyer uploads their own image and it gets printed on the product. The one thing every cheap version
of this gets wrong is **size**: the image is shown in some arbitrary box, so nobody knows what actually
reaches the printer. A phone screenshot looks fine on screen and prints blurry across a 900 mm mousepad.

So this feature answers two questions before the order, not after:

1. **What area gets printed?** The dashed rectangle in the preview is the real print area, always.
2. **Is this image big enough for that area?** The badge says so in DPI, and names the pixel count the
   print size asks for.

<br/>

## 1. How does it look like

`?modal=PersonalizeModal&productId=<prod_id>&variantId=<variant_id>` opens:

```
┌──────────────────────── Personalize ────────────────────────┐
│  ┌───────────────────────────┐   Your image                 │
│  │ mockup image              │   [ choose a file ]          │
│  │  ┌ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┐    │   paste with Ctrl+V too      │
│  │  │  your design here │    │                              │
│  │  └ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┘    │   ● Sharp print · 300 DPI    │
│  └───────────────────────────┘   Zoom  ──────●────           │
│  Print area: 900 × 400 mm         [ Add to cart ]            │
└─────────────────────────────────────────────────────────────┘
```

| Piece | File |
| --- | --- |
| Modal shell, upload, zoom, add to cart | `PersonalizeModal.tsx` |
| Mockup + print-area overlay + drag | `components/PersonalizePreview.tsx` |
| DPI badge + required-pixel line | `components/PersonalizeQualityBadge.tsx` |
| Upload + design row | `functions/uploadDesignFn.ts` |
| Entry button | `app/components/ui/Buttons/PersonalizeButton.tsx` |
| All the math | `app/utils/printMetrics.ts` |
| Owner's print-area editor | `app/components/ui/Modals/AdminPanel/components/PersonalizationForm.tsx` |
| Missing-SQL detection | `app/utils/personalizationSchema.ts` |
| Types | `app/ts/product/TPersonalization.ts` |
| Route | `app/api/personalized-designs/route.ts` |

### Where the owner finds the editor

```
Admin panel (?modal=AdminPanel)                     /[locale]/products/<id>/manage
  ├─ Add product      AddProductForm.tsx              └─ ManageProductView
  │    └─ PersonalizationForm  (no productId:              └─ PersonalizationForm  (card chrome)
  │       reports a draft through onDraftChange)
  └─ Edit product
       └─ <a product row>  OwnerProduct.tsx
            └─ PersonalizationForm  (chrome removed
               by the className prop)
```

One component, three mount points - only the surface classes differ, so the drawing, the mm inputs and
the aspect guard have a single implementation. What changes is where the config goes:

| Mount | `productId` | Where the config goes |
| --- | --- | --- |
| Add product | absent | `onDraftChange` → `personalizationDraft` → `createProductFn` → the insert |
| Edit product | present | its own update button → `productsSDK.updateProduct` |
| Manage page | present | same as Edit product |

With a `productId` the form shows its update button and calls `replaceProduct` afterwards, which
re-syncs the admin panel row and is a no-op on the manage page. Without one there is no row to update,
so the button is replaced by `personalize.admin_draft_hint`.

### Marking the print area before the product exists

The mockup is still one of the images queued for upload, so the draft holds an **index** into that
queue, never a URL:

```
TPersonalizationDraft { isEnabled, mockupImageIndex, printArea, mockupRect }
        │
        │  createProductFn uploads the images
        ▼
resolveUploadedPersonalization(draft, uploadedImageUrls)   app/functions/createProductHelpers.ts
        │  mockupImageIndex 1  →  uploadedImageUrls[1]
        ▼
TProductPersonalization { isEnabled, defaultConfig: { mockupUrl, printArea, mockupRect } }
        │
        ▼
POST /api/products/translate-insert  →  23_products.personalization
```

The same helper runs backwards in the form: a restored draft is turned back into a config so the editor
re-mounts on what the owner had marked out when a create fails.

### Each variant wants its own photo

`product.variant_image_matches_hint` sits under every variant image picker (Add product, the Edit tab's
`VariantsForm`, and the manage page): **"Make sure to use an image that matches this variant - the print
area is measured against its real size."** The print area is in mm and the rectangle is a % of the photo,
so a variant showing a different variant's photo makes the buyer's preview lie about what gets printed.

### Types

```ts
TPrintArea  = { widthMm, heightMm, minDpi? }                 // the physical print area
TMockupRect = { leftPct, topPct, widthPct, heightPct }       // where it sits on the mockup image
TPersonalizationConfig = { mockupUrl, printArea, mockupRect }
TProductPersonalization = { isEnabled, defaultConfig, variantConfigs? }
TDesignPlacement = { scale, offsetXPct, offsetYPct }
```

### Where the data lives

```
23_products.personalization JSONB          ← the owner's config (print size + mockup + rectangle)
  ├─ defaultConfig                          used when a variant has no size of its own
  └─ variantConfigs["<variantId>"]          per-variant sizes (S/M/L, 30x40 vs 50x70)

23_personalized_designs                     ← what a buyer uploaded
  ├─ source_url                             the file, in bucket 23_public-images/personalized/<userId>
  ├─ print_width_mm / print_height_mm        the size it was ordered at
  ├─ placement JSONB                         scale + offsets the buyer chose
  ├─ effective_dpi                           what it prints at
  └─ status                                  draft → ordered (set after payment)

cart line (localStorage "cart" / 23_users_cart.cart_products)
  └─ { id, quantity, variantId, designId }   key = productId::variantId::designId
```

<br/>

## 2. Terminology

| Term | Meaning |
| --- | --- |
| **print area** | the physical rectangle that gets printed, in mm. Not a pixel size |
| **mockup** | the photo of the product the preview is drawn on |
| **mockup rect** | where the print area sits on that photo, in % of the photo |
| **placement** | the buyer's zoom + drag inside the print area |
| **effective DPI** | dots per inch of the part of the upload that reaches the print area |
| **design** | one row in `23_personalized_designs` - one buyer's image for one product |

<br/>

## 3. How it works

### The preview stays honest at any size

The overlay is a **percentage box inside the mockup**, never a pixel size:

```
mockup rendered at 600 px wide      mockup rendered at 1200 px wide
┌───────────────────────┐           ┌───────────────────────────────────────┐
│   ┌ ─ ─ ─ ─ ─ ─ ┐     │           │      ┌ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┐        │
│   │ 90% × 60%   │     │           │      │      90% × 60%        │        │
│   └ ─ ─ ─ ─ ─ ─ ┘     │           │      └ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┘        │
└───────────────────────┘           └───────────────────────────────────────┘
   both are 900 × 400 mm               both are 900 × 400 mm
```

`storybook/commerce/Personalize.stories.tsx → PrintAreaMatchesPhysicalSize` measures the rendered box
and fails if its proportions drift more than 2% from `widthMm / heightMm`.

### Effective DPI

The image covers the print area, so only a rectangle with the print area's proportions is used, and
zooming uses even less:

```
upload 6000 × 3000 px, print 900 × 400 mm
  used region  = 6000 × 2666 px   (900/400 proportions)
  900 mm       = 35.43 in
  DPI          = 6000 / 35.43     = 169  → "Good enough" (>= 150)

same upload at zoom 2x
  used region  = 3000 × 1333 px
  DPI          = 3000 / 35.43     = 84   → "Too few pixels"

phone screenshot 1200 × 800 px
  DPI          = 33               → "Too few pixels", and the modal says:
                                    "needs at least 5315 × 2363 px for 150 DPI"
```

### The aspect guard

If the mockup rectangle is not the shape of the print area, the preview shows a crop the buyer never
gets. `getAspectDrift` measures that; over 2% the admin form refuses the config and offers the
`heightPct` that matches (`getAspectCorrectHeightPct`).

### From upload to print job

```
choose/paste image → readPastedImages (size + resolution gate)
  → uploadImageFn  → 23_public-images/personalized/<userId>   (no Tinify: the printer needs the pixels)
  → POST /api/personalized-designs                            → design row, status "draft"
  → increaseProductQuantity(productId, variantId, designId)   → its own cart line
  → checkout line name ends with "· design <first 8 chars>"   → findable in the Stripe dashboard
  → payment step 7 PATCHes the design                         → status "ordered"
```

<br/>

### The SQL has not been run yet

The two pieces this feature needs are created by hand from the **🖼️ PRODUCT PERSONALIZATION** block in
`dev_readme-supbase-sql.md`: the `personalization` column on `23_products` and the
`23_personalized_designs` table. Until that runs, Postgres answers every write with a message that says
nothing about what to do, so both routes check for it and name the block instead:

```
owner presses "Update personalization"
  → POST /api/products/update           column missing → 503 { error: "The \"personalization\" column of
                                        23_products is missing in the database. Run the 🖼️ PRODUCT
                                        PERSONALIZATION block in dev_readme-supbase-sql.md, then try again." }
  → PersonalizationForm catch           → error toast with that sentence

buyer presses "Add to cart" in the modal
  → POST /api/personalized-designs      table missing → 503, same shape
  → uploadDesignFn returns the message  → error toast, and the button stops showing "Adding..."
```

`isMissingSchemaError` in `app/utils/personalizationSchema.ts` matches Postgres codes `42703` / `42P01`
and PostgREST's `PGRST204` / `PGRST205`, so a missing column and a missing table both land here.

<br/>

## 4. TODO

- [x] Admin form to set the print size and drag the rectangle on the mockup:
      `app/components/ui/Modals/AdminPanel/components/PersonalizationForm.tsx`. Tick "Buyers can
      personalize this product", pick one of the product's own images as the mockup, type the print size
      in mm, drag the rectangle over it. The rectangle turns red when its shape drifts from the print
      size, with a one-click fix. It updates `23_products.personalization` through
      `productsSDK.updateProduct`.
- [x] Reachable from the admin panel: **Product workspace → Edit product → a product**, not only from the
      product's manage page. Stories: `Admin/Personalization → InsideAdminPanel` and `→ PrintAreaEditor`.
- [x] A missing `personalization` column or `23_personalized_designs` table is reported as "run this SQL
      block" instead of a raw Postgres message.
- [ ] Notify the owner on a paid personalized order (design URL + print size + DPI), reusing the
      `requestBetterPrices.tsx` email + Telegram path.
- [ ] Show the design thumbnail on the personalized line in `app/emails/CheckEmail.tsx`.
- [ ] Decided AGAINST for now: a private bucket + signed URLs for designs. Every image in this project
      lives in the public bucket; moving only designs would need a signing route and a new policy set.
- [ ] Decided AGAINST: rotation. It multiplies the crop and DPI math, and nobody asked for it.
