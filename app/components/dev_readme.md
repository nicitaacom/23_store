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

## Info about SupportButton.tsx

This button that you always see in bottom right corner
Logic for this button:
User send message and this message insert new row with ticketId and info about userId (if no user generate anonymous\_${uuidv4})
Also this solution is scaleable because its not 1v1 converstion where support messages with bot in telegram and messages the user sent
transfers to chat with telegram bot - no its better because if 2 users in the same time witll send messages support need to reply for each
with ticketId:'id' in telegram (it better when only 1-2 requests per day) but for scalebility
(I know that Josh say like 'think about scalebility when it will be really needed') but still I have this logic:

1. user or !user send message and to support on site
2. after first send message
   if user - create ticketId based on userId lik user.id\_${uuidv4}
   if !user - create ticket id with ${uuidv4}
   and call function onCreateTicket() in this function bot send message in telegram
3. user and !user may have only 1 open ticket to create new ticket
   this current ticket must be closed with vote 1/5 and feedback optional

## Info about SwitchDarkMode.tsx

I use this file (functional component) to switch between dark and light mode
