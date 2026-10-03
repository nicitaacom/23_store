# Product variant options

The owner edits one card per variant, such as Grey. Size, Color, and Weight are parameters inside
that card. Each purchasable combination still has its own row and ID in the JSONB `variants` value,
so its price, stock, and cart entry can be tracked separately.
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

The editor shows which variant owns the parameters. Adding a variant stores its combinations under
that variant only, then clears the option inputs for the next variant. A Blue variant with Size S/M
and a Red variant with Weight 10 kg remain separate. In the Admin Panel edit form and standalone
manage page, rows with the same `group_id` appear under one card; each parameter combination has
its own price and stock inputs. Adding Size 40 to Grey adds a Size 40 row inside the Grey card.

Rows expanded from one draft share a `group_id` in the existing JSONB `variants` value. The buyer's
option picker shows values from the selected group, and switching Size or Weight prefers another row
in that group. Choosing a different variant chip changes groups. Older rows without `group_id` retain
the original global option picker behavior. No SQL migration is needed.

Adding or saving a variant expands the entered values into one row per combination. For example,
Size 36/38 and Color Blue/Red create four purchasable combinations with separate IDs. The entered
price, stock, and image are copied to each row; owners can adjust them under that variant card in
the Edit tab or manage page. Every row keeps the same variant label; the size stays in `options`.
Editing parameter values preserves IDs, prices, and stock for combinations that already exist.
Creation and editing reject a set that would exceed the 32-combination product limit. Saved `options` contain one string
per name, so the picker, cart, and orders keep using a specific variant ID. Old variants without
`options` continue to work. No SQL migration is needed because `variants` is JSONB.

`resolveUploadedProductVariants` retains options during creation. The update route keeps them through
`normalizeProductVariants`; `cleanVariantOptions` trims entries and rejects malformed values. The
catalog card and detail page use `VariantOptionPicker` to display one group per option name. Selecting
a value chooses the matching purchase row that preserves the most other selected values, then updates
the existing ID, price, stock, image, and cart behavior. The variant chip row displays one choice per
`group_id`; checkout and emails include the selected parameter value so the size reaches the order.

The focused checks are `app/utils/variantOptions.test.ts`, the `MultipleValuesForOneOption` Storybook
story in `storybook/admin/AdminPanelModal.stories.tsx`, and the `ColorAndSizeOptions` and
`WeightOptionsStayWithVariant` stories in `storybook/commerce/Product.stories.tsx`.
