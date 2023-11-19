## Info about SupportButton.tsx

This button that you always see in bottom right corner
Logic for this button:
User send message and this message insert new row with ticketId and info about userId
(if no user generate `anonymous_${crypto.randomUUID()}` - in Layout.tsx 31 line)
Also this solution is scaleable because its not 1v1 converstion where support messages with bot in telegram and messages the user sent
transfers to chat with telegram bot - no its better because if 2 users in the same time witll send messages support need to reply for each
with ticketId:'id' in telegram (it better when only 1-2 requests per day) but for scalebility
(I know that Josh say like 'think about scalebility when it will be really needed') but still I have this logic:

1. user or !user send message and to support on site
2. after first send message
   //TODO - update docs here
   and call function onCreateTicket() in this function bot send message in telegram
3. user and !user may have only 1 open ticket to create new ticket
   this current ticket must be closed with vote 1/5 and feedback optional
