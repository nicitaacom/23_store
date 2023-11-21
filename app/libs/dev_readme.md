## When you should use libs folder

You should use this folder only for some dependencies you install with `pnpm i dependency-name`

## When you should NOT use libs folder

If you create some file not related to some dependency from `package.json`
For examples see files in this folder

<br/>

---

<br/>

<br/>

## How to use stripe

if you want to do something with stripe just google smth like

1. `how to create product on stripe`
2. Go to the first link in google
3. e.g in [this guide](https://stripe.com/docs/api/products/create) you see

```ts
const stripe = require("stripe")(
  "sk_test_51NUvmbDEq5VtEmnoPpiL47UpmArBVixTaRVYstuNf8VNN4KI6u3su1lo6RknsBQ9b1yLtsYKWE2ZB5my7hRoigtS00bUSPqKam",
)

const product = await stripe.products.create({
  name: "Gold Special",
})
```

4. As you already have set up for stripe in stripe.ts - just use stripe in `api` folder using stripe docs

<br/>

<br/>

<br/>

<br/>

## How to use supabase

Naming tells for themselfs

`SupabaseClient` - use in client components with 'use client'
`SupabaseServer` - use in server components without 'use client'
usually you use in in page.tsx or layout.tsx to preload some data on SSR
`SupabaseServerAction` - use this file in server action with 'use server'
lso I use it in route hadlers (api folder) because I see no difference between them

To do something in DB (supabase) - just google about it as well e.g

1. `How to insert row in supabase`
2. Open [first link](https://supabase.com/docs/reference/javascript/insert)
3. Use it like so - instead supabase write `SupabaseClient` or `SupabaseServer` or `SupabaseServerAction`

```ts
const { error } = await supabase.from("countries").insert({ id: 1, name: "Denmark" })
```

4. Throw error if needed

```ts
if (error) throw error
```

<br/>

<br/>

<br/>

<br/>

## How to use pusher

example

```ts
await pusherServer.trigger(ticketId, "tickets:new", { ticketId, ownerUsername, message })
await pusherServer.trigger(ticketId, "messages:new", newMessage)
```

accept 3 arguments (channelId,event,data)

1. ChannelId - you write to which channel user should be connected to
   for example it micht be ticketId as channel id
   Imagine its as div with id prop inside this div you may have a bunch of sutuff
   So you need to trach some div to let pusher know what channel you want trigger
   ![channelId](https://i.imgur.com/lmr2vxQ.png)
2. event - its string value with short and clear name of event like `messages:new`
3. data - its data of chanes pusher will listen to
   3.1 For this you create state (useState or global state with zustand or mobx)
   `ClientComponent.tsx`

   ```tsx
   const [messages, setMessages] = useState(initialMessages)
   useEffect(() => {
     pusherClient.subscribe(ticketId)
     if (bottomRef.current) {
       bottomRef.current.scrollTop = bottomRef.current.scrollHeight
     }

     const messagehandler = (message: IMessage) => {
       //TODO - axios.post('api/messages/{ticketId}/seen')
       setMessages(current => {
         if (find(current, { id: message.id })) {
           return current
         }

         return [...current, message]
       })

       //Timeout is required here because without it scroll to bottom doesn't work
       setTimeout(() => {
         if (bottomRef.current) {
           bottomRef.current.scrollTop = bottomRef.current.scrollHeight
         }
       }, 10)
     }

     pusherClient.bind("messages:new", messagehandler)

     return () => {
       pusherClient.unsubscribe(ticketId)
       pusherClient.unbind("messages:new", messagehandler)
     }
   }, [messages, ticketId])

   return (
     <ul className="h-[280px] mobile:h-[370px] flex flex-col gap-y-2 hide-scrollbar p-4" ref={bottomRef}>
       {messages.map(message => (
         <MessageBox key={message.id} message={message} />
       ))}
     </ul>
   )
   ```

   3.2 Next you need to subscribe pusher to some channel he will listen to
   as you see in example above its channel `ticketId`
   ![channel-example](https://i.imgur.com/1cwPGRE.png)

   3.3 Next you need to bind pusher to changes and add handler for this
   In my case I follow Antonio's guide and do as he said to avoid overflow
   Just write your handler with this example

   ```ts
        const messagehandler = (message: IMessage) => {
       //TODO - axios.post('api/messages/{ticketId}/seen')
       setMessages(current => {
         if (find(current, { id: message.id })) {
           return current
         }

         return [...current, message]
       })
   ```

   3.4 As you can see I pass to the third argument data that pusher will change
   Without it in `current` will be only that data that you passed in third argument here

   ```ts
   await pusherServer.trigger(ticketId, "messages:new", newMessage)
   ```

   Its imprtant so if you need to change some data on client you need to pass it
   in third argument in prop on server

   In short this `(message: IMessage)` comes from third argument `newMessage`
   current its current state of messages - in my example you just spread out this array and
   add that message that you pass as third argument in `pusher.trigger` function on a server
