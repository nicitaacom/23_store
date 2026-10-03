# Catalog product search

`page.tsx` reads `?query=`, selects products, normalizes their translations and variants, then calls
`filterProductsBySearchQuery` in `app/utils/productSearch.ts` before pagination. The dedicated
`search/page.tsx` and the Admin Panel Edit/Delete lists call the same helper.

The helper checks each title, variant label, or description separately. It shows and ranks title
matches first, then variant labels. Descriptions are a fallback only when no product name or variant
label matches in the selected product set. This keeps a query such as `whey` focused on products named
Whey while still allowing description searches when names do not match. Tests live in
`app/utils/productSearch.test.ts`.
