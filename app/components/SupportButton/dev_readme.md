## Info about SupportButton.tsx

This button that you always see in bottom right corner
Logic for this button:

1. user or !user send message and to support on site using SupportButton.tsx
2. After first message I send telegram message with telegram bot API to support (myself) like 'somebody need help'
   To check is this first message I create
3. user and !user may have only 1 open ticket to create new ticket
   this current ticket must be closed with vote 1/5 and feedback optional
