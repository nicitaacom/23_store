# Mobile catalog pagination

The catalog page in `app/[locale]/(site)/page.tsx` keeps the product list inside a fixed-height
panel and places `PaginationControls` in the panel footer. On narrow screens, the footer shows
Previous, at most three nearby page numbers, and Next in one row. The desktop row retains the
full page list and ellipses. Both rows use the same URL builder, so `page`, `perPage`, and the
search query stay in sync.

`storybook/commerce/Catalog.stories.tsx` has the `MobilePagination` story. It checks that all
visible links remain on one line inside a 320px container. Use it when changing button widths,
gaps, or the number of visible pages.
