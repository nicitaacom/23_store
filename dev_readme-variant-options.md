# Product variant options

Each purchasable variant is still one row with its own ID, price, stock, label, and optional image.
The JSONB `variants` column can now also hold `options`, for example:

```json
{ "id": "blue-large", "label": "Blue / Large", "options": { "Color": "Blue", "Size": "Large" }, "price": 12, "quantity": 5 }
```

The Add Product form, Admin Panel variant editor, and standalone Manage Product page all use
`VariantOptionsEditor`. Add the same option names to each combination you sell. Color, Size, and
Weight use stable stored names and localized labels; any other name is kept as entered. Old variants
without `options` continue to work. No SQL migration is needed because `variants` is JSONB.

`resolveUploadedProductVariants` retains options during creation. The update route keeps them through
`normalizeProductVariants`; `cleanVariantOptions` trims entries and rejects malformed values. The
catalog card and detail page use `VariantOptionPicker` to display one group per option name. Selecting
a value chooses the matching variant that preserves the most other selected values, then updates the
existing variant ID, price, stock, image, and cart behavior. Variant chips remain available for rows
without options and for combinations that need a direct choice.

The focused checks are `app/utils/variantOptions.test.ts` and the `ColorAndSizeOptions` Storybook
story in `storybook/commerce/Product.stories.tsx`.
