## Usage for getInitialMessages.ts

I use this action to get initial messages that I pass as a props in `SupportButton.tsx` in `app/layout.tsx`

## Usage for getLastMessageByTicketId.ts

I use this file to get info about last message to show it in `DesktopSidebar.tsx`
![last-message](https://i.imgur.com/TKIaRLk.png)

## Usage for getMessagesByTicketId.ts

I use this action to output messages by ticketId on `/support/tickets/ticketId` route

## Usage for getOwnerProducts.ts

I use this action to get owner products on SSR to pass them through props in `AdminPanel.tsx`
To show them in `EditProductForm.tsx` and `DeleteProductForm.tsx`

## Usage for fetchTicketId.ts

If fetch it means that I do it in client component that's why I use supabaseClient getCookie from helpersCSR and stuff like that

I fetchTicketId to subscribe pusher to this channelId (ticketId) to get live-update
by live-update I mean when user send message from 1 device and another device recieve this message in real-time

Get data about userId or anonymousId and then find row in table `tickets` that matches that userId and is_open
Then I return this single row
I don't select data by username because in this project I let everybody to have username they want
So that's why if 2 users have the same username - I select multiple rows - I don't want it (because I need just 1 ticketId)

## Usage for getTickets.ts

I use this action to show all tickets in `DesktopSidebar.tsx` and `MobileSidebar.tsx`
I pass in these components as a prop data that I got from DB during SSR
`/support/tickets/layout.tsx` - component where I pass these props

## Usage for getTickets.ts

This action required to get amount of unread messages
I did it with ChatGPT
