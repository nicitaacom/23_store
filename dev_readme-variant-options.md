# Product variant options

Each purchasable variant is still one row with its own ID, price, stock, label, and optional image.
The JSONB `variants` column can now also hold `options`, for example:

```json
{ "id": "blue-large", "label": "Blue / Large", "options": { "Color": "Blue", "Size": "Large" }, "price": 12, "quantity": 5 }
```

The Add Product form, Admin Panel variant editor, and standalone Manage Product page all use
`VariantOptionsEditor`. The editor keeps a list of values for each name: adding `Size: 38` after
`Size: 36` shows both chips. After adding a value, the name stays selected and focus returns to the
cleared value field so another size can be entered immediately. Removing a chip removes only that
value. Color, Size, and Weight use stable stored names and localized labels; any other name is kept
as entered.

The editor shows which variant owns the draft options. Adding a variant stores its combinations on
that variant only, then clears the option inputs for the next variant. A Blue variant with Size S/M
and a Red variant with Weight 10 kg remain separate; options entered for one do not carry into the
other. The same ownership label appears in the Admin Panel edit form and standalone manage page.

Rows expanded from one draft share a `group_id` in the existing JSONB `variants` value. The buyer's
option picker shows values from the selected group, and switching Size or Weight prefers another row
in that group. Choosing a different variant chip changes groups. Older rows without `group_id` retain
the original global option picker behavior. No SQL migration is needed.

Adding or saving a variant expands the entered values into one row per combination. For example,
Size 36/38 and Color Blue/Red create four variants with separate IDs. The entered price, stock, and
image are copied to each row; owners can adjust those rows afterward in the Edit tab. The first row
keeps the entered label, and other rows include their choices in the label. Creation and editing
reject a set that would exceed the 32-variant product limit. Saved `options` still contain one string
per name, so the picker, cart, and orders keep using a specific variant ID. Old variants without
`options` continue to work. No SQL migration is needed because `variants` is JSONB.

`resolveUploadedProductVariants` retains options during creation. The update route keeps them through
`normalizeProductVariants`; `cleanVariantOptions` trims entries and rejects malformed values. The
catalog card and detail page use `VariantOptionPicker` to display one group per option name. Selecting
a value chooses the matching variant that preserves the most other selected values, then updates the
existing variant ID, price, stock, image, and cart behavior. Variant chips remain available for rows
without options and for combinations that need a direct choice.

The focused checks are `app/utils/variantOptions.test.ts`, the `MultipleValuesForOneOption` Storybook
story in `storybook/admin/AdminPanelModal.stories.tsx`, and the `ColorAndSizeOptions` and
`WeightOptionsStayWithVariant` stories in `storybook/commerce/Product.stories.tsx`.
