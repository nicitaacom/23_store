# What in this docs?

- for what this docs is
- when use/not use this folder
- explanation for each `file.ts`
  - pusher.ts
  - resend.ts
  - stripe.ts
  - supabase
    - supabaseAdmin.ts
    - supabaseClient.ts
    - supabaseServer.ts
    - supabaseServerAction.ts

<br/>

# For what this docs is

This docs created to help you undestand how to use some library in this project
Also this docs explains purpose of each file

<br/>

# When you should use/not use libs folder

### When you should use libs folder

You should use this folder only for some dependencies you install with `pnpm i dependency-name`
Also if it required e.g dependency with some API key

### When you should NOT use libs folder

If you create some file not related to some dependency from `package.json`
For examples see files in this folder

<br/>

# Explanation for each `file.ts`

<details>
  <summary>pusher.ts</summary>

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

</details>

<details>
  <summary>resend.ts</summary>

This file is required to send emails
I already set up resend+supabase intrgration so you may don't care about setup

Use this file in API routes cause it requires secret key that must be NOT exprosed on client (in "use client" files)

### Example (resend in API route)

```ts
import { resend } from "@/libs/resend"

const { error } = await resend.emails.send({
  from: from,
  to: to,
  subject: subject,
  html: html,
})
if (error as ErrorResponse) {
  return new NextResponse(`/api/check/send-email/route.ts error \n ${error?.message}`, {
    status: 400,
  })
}
```

### Read docs

Here you may find usefull info that might help you - https://resend.com/docs/introduction
Also if you have questions you may ask - https://resend.com/help

</details>

<details>

<summary>stripe.ts</summary>

use stripe.ts if you want to create some payment

If you have question how to do something with stripe just google smth like

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

Also yoy may message stripe support - support-reply@stripe.com

</details>

<details>

<summary>supabase</summary>

Naming tells for themselfs
`supabaseAdmin.ts` - use in API routes if you want to bypass RLS
In API route because it require secret key
`supabaseClient.ts` - use in client components with 'use client'
`supabaseServer.ts` - use in server components without 'use client'
usually you use it in page.tsx or layout.tsx to preload some data on SSR
`supabaseServerAction.ts` - use this file in server action with 'use server'
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
catch (error: any) {
 if (error instanceof Error) {
      console.log(90, "DELETE_FOOD_ERROR\n (supabase) \n", error.message)
      return new NextResponse(`/api/food/delete/route.ts error \n ${error}`, {
        status: 500,
    })
  }
}
```

## Use supabaseServer like this (fire function - supabaseServer())

```tsx
const user = await supabaseServer().auth.getUser()
```

</details>
