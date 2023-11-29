## Info about ClientOnly.tsx

I use this file because Code with Antonio do the same
I use it to prevent hydration error
If I use this file I understnad that user will see `<InitialPageLoadingSkeleton/>`
intead of white screen with not clickable UI
I'm sure that see skeleton definetly better

## Info about Language.tsx

I use this file only 1 time in navbar
This file may be named as `<LanguageSwitcher/>`
I keep this name and this location for this file
because I may use it in sidebar

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

## Info about SwitchDarkMode.tsx

I use this file (functional component) to switch between dark and light mode
You can find this component in top right corner on / route
