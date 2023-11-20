## Usage for getOwnerProducts.ts

I use this action to get owner products on SSR to pass them through props in `AdminPanel.tsx`
To show them in `EditProductForm.tsx` and `DeleteProductForm.tsx`

## Usage for getConversationId.ts

I getTicketId to subscribe pusher to this channelId (ticketId) to get live-update
by live-update I mean when user send message from 1 device and another device recieve this message in real-time

Get data about userId or anonymousId and then find row in table `tickets` that matches that userId and is_open
Then I return this single row
I don't select data by username because in this project I let everybody to have username they want
So that's why if 2 users have the same username - I select multiple rows - I don't want it (because I need just 1 ticketId)
