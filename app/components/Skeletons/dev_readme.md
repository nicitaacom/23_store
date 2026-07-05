## Usage for FormSkeleton.tsx

tbh this file useless because I use SSR to load data from DB
It may be helpful when user click '>' in pagination bar to go to the next page
In case user have slow internet this skeleton will be shown

## Usage for InitialPageLoadingSkeleton.tsx

This skeleton uses for initial page loading
Issues:

1. UI doesn't match actiall UI (I mean position is not pixel perfect for all devices)

## Support skeletons (`support/**`)

The 6 support skeletons are token `animate-pulse` blocks (`rounded bg-foreground/60` /
`bg-foreground/40`) that mirror the real support layout — they do NOT use `react-loading-skeleton`
(the other skeletons still do). File paths, export names and the `{ ticketId }` prop stay fixed so
`ClientOnly.tsx` wiring is untouched. `[ticketId]/loading.tsx` reuses the header/body/footer skeletons
so clicking a ticket immediately shows the thread loading instead of the previous ticket's messages.
