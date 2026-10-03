# Product detail page and language errors

`page.tsx` selects one row from `23_products`, passes it through `normalizeProduct()`, and chooses
the requested `translations[locale]` with Finnish as fallback. `generateMetadata()` uses the same
normalized row. `ProductDetailView.tsx` renders the title, description, images, variants, and
optional personalization. The component reads the active locale with `useCurrentLocale()` and
UI text with `useScopedI18n("product")`; both hooks come from `app/locales/client.ts`.

If one product shows a client error such as `i is not a function`, capture the browser console
stack and the product ID. The error boundary's support email includes the browser stack (up to
4,000 characters) and page URL; a minified message by itself is insufficient. The support report
uses React 19's static renderer because the installed `@react-email/render` brings React 18 and
cannot render this app's React 19 elements. Compare the row's
`translations`, `variants`, and `personalization` JSON with a working product. Reproduce with the
row still present: a deleted ID reaches `notFound()` and does not execute `ProductDetailView`.
`app/[locale]/error.tsx` displays the error and offers retry and
support reporting, but its minified message alone does not identify the failing call.

On 2026-10-02, the ID in the 2026-09-09 screenshot (`prod_UIQ9kj7CdXoQCF`) returned the product
not-found page on the live site. Another live Russian product detail page rendered without a
browser error. The original exception therefore could not be reproduced from the remaining data.
