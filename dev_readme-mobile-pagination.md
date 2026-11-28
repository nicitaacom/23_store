# Mobile catalog pagination

The catalog page in `app/[locale]/(site)/page.tsx` keeps the product list inside a fixed-height
panel and places `PaginationControls` in the panel footer. On narrow screens, the footer shows
Previous, at most three nearby page numbers, and Next in one row. The desktop row retains the
full page list and ellipses. Both rows use the same URL builder, so `page`, `perPage`, and the
search query stay in sync.

The server sends the filtered catalog to `CatalogProductPages`, which selects the current page in
the browser. Pagination links update the URL through the History API, so page changes and browser
Back/Forward update the products without a document reload or another catalog request. Direct
page URLs still render the requested slice on the initial request. Category and search changes
continue to fetch the matching catalog from the server.

`storybook/commerce/Catalog.stories.tsx` has the `MobilePagination` story. It checks that all
visible links remain on one line inside a 320px container. Use it when changing button widths,
gaps, or the number of visible pages.
