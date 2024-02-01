# What in this docs?

- Reason of this organization route (support)
- How do I send message

# Reason of this organization route (support)

I created this layout because I don't need support button on /support/tickets route
Also it help to separate default routes from routes where user need authorization (SUPPORT role)

# How do I send message

In `MessagesFooter.tsx` I have input with based on useState because useForm() throw error `supabase key is required`<br/>
But I even don't use supabase in `MessagesFooter.tsx`<br/>
<br/>

So I use `/api/message/seen` to mark message as 'seen'<br/>
and `/api/message/send` to send message

Also in some `MessagesBody.tsx` or in place where I recieve messages e.g `SupportButton.tsx`
I use useEffect and I subscribe pusher to some chnnel in this useEffect to listen to actions in this channel
And if 'messages:new' event and I insert new message that I got from data I pass in `pusherServer.tirgger`
and 'messages:seen' event - on this event I update current array so all messages from `sender_id` get 'seen' true
