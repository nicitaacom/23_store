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
