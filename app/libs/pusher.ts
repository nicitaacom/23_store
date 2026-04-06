import PusherServer from "pusher"
import PusherClient from "pusher-js"

export const pusherServer = new PusherServer({
  appId: process.env.PUSHER_APP_ID,
  key: process.env.NEXT_PUBLIC_PUSHER_APP_KEY,
  secret: process.env.PUSHER_SECRET,
  cluster: "eu",
  useTLS: true,
})

let pusherClientInstance: PusherClient | null = null

export const getPusherClient = () => {
  if (!pusherClientInstance) {
    pusherClientInstance = new PusherClient(process.env.NEXT_PUBLIC_PUSHER_APP_KEY, { cluster: "eu" })
  }
  return pusherClientInstance
}

export const subscribePusherChannel = (channelName: string) => {
  const pusherClient = getPusherClient()

  return pusherClient.channels?.find(channelName) ?? pusherClient.subscribe(channelName)
}
