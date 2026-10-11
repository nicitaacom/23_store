## Info about ClientOnly.tsx

I use this file because Code with Antonio do the same
I use it to prevent hydration error
If I use this file I understnad that user will see `<InitialPageLoadingSkeleton/>`
intead of white screen with not clickable UI
I'm sure that see skeleton definetly better

## Info about LanguageDropdown.tsx

The language menu is used in the navbar and mobile sidebar. Its trigger uses `h-8` (32px) for a
compact header control; menu rows keep `min-h-[44px]` for selecting a language. The sidebar menu
opens upward with `isDropUp`.

For authenticated accounts, the menu updates `23_users.preferred_language` before navigating.
`Layout` restores that preference after login through `useSetLayoutLanguage`, so it survives cleared
cookies. See `app/locales/dev_readme_i18n.md` for the API and database column.

## Info about Layout.tsx

I use this file to set dark/light mode based on system settings
if user have already setup dark or light mode - I load this setup

## Info about PaginationControls.tsx

This component you see at / route in bottom of the page
This component needed to switch between pages and load products from next page
becuase I use pagination (It means I load only n products per page)

![PaginationControls.tsx-image](https://i.imgur.com/KsQZi3k.png)

## Info about ProductsPerPage.tsx

I use this component to show how much products will be shown per page
I added this component because some users may be annoyed with clicking '>' button
to go to the next page (also that's why I added up to 100 per page)

![ProductsPerPage.tsx-image](https://i.imgur.com/WIeGtz2.png)

## Info about DarkModeRadioButton.tsx

I use this file (functional component) to switch between dark and light mode
You can find this component in top right corner on / route
The knob stays inside the 36×20px track in both modes. The button keeps its 44×44px click area
and exposes the selected mode with `role="switch"` and `aria-checked`.
