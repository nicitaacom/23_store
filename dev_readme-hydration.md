# Hydration and browser extensions

The root layout in `app/[locale]/layout.tsx` renders `<meta name="darkreader-lock" />` in the
server HTML head. Dark Reader documents this tag as the way for a site to request that its theme
engine leave the page alone. Joki already has its own light and dark themes.

The reported navbar mismatch showed `--darkreader-inline-stroke` on an SVG only in the browser.
That property is added by Dark Reader's inline SVG style handling, even when the extension appears
disabled for a site. The navbar renders the same `AiOutlineMenu` markup on the server and client;
the extra browser-side style caused React's hydration comparison to warn. The root HTML's existing
`suppressHydrationWarning` covers only the HTML element itself, so it does not cover nested SVGs.

If another hydration warning appears, compare the exact server/client attribute in the Next.js
message. An extension-only attribute should be tested with a clean browser profile; a difference
in app data, text, or element structure needs a fix in the component that renders it.
