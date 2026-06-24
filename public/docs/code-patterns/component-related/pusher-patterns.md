1. When subscribing to a Pusher channel, always reuse an existing channel instead of creating a
   duplicate subscription. Use `pusherClient.channels?.find(channelName) ?? pusherClient.subscribe(channelName)`.
2. Before binding a Pusher event handler, always call `pusherClient.unbind(eventName)` (no
   handler argument) to hard-reset and guarantee no duplicate handlers accumulate across
   re-renders or StrictMode double-invocations.

Example

```ts
import { useEffect } from "react"

import { getPusherClient } from "@/libs/Pusher/pusher"
import { useIsTyping } from "@/store/support/useIsTyping"

/**
 *
 * @param userId - pass here userId you want know whether is typing
 */
export const useSubscribeToIsTyping = (userId: string) => {
  const { isTyping, setIsTyping } = useIsTyping()

  useEffect(() => {
    const pusherClient = getPusherClient()
    const channelName = `${userId}-isTyping`

    // 1. reuse existing channel — avoid redundant WebSocket subscriptions
    const channel = pusherClient.channels?.find(channelName) ?? pusherClient.subscribe(channelName)

    const handleIsTyping = (isTyping: boolean) => setIsTyping(isTyping)

    // 2. hard reset — no duplicate handlers ever
    channel.unbind("user:isTyping")
    channel.bind("user:isTyping", handleIsTyping)

    return () => {
      channel.unbind("user:isTyping", handleIsTyping)
      pusherClient.unsubscribe(channelName)
    }
  }, [userId])

  return { isTyping }
}
```
