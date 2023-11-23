import { pusherServer } from "@/libs/pusher"
import supabaseAdmin from "@/libs/supabaseAdmin"
import supabaseServer from "@/libs/supabaseServer"
import { getCookie } from "@/utils/helpersSSR"

export interface UnseenMessages {
  ticket_id: string
  amount_unseen: number
}

const getUnreadMessages = async () => {
  const {
    data: { user },
  } = await supabaseServer().auth.getUser()

  const userId = user?.id === undefined ? getCookie("anonymousId")?.value : user.id

  const { data, error } = await supabaseAdmin
    .from("messages")
    .select("ticket_id,id,seen")
    .not("sender_id", "eq", userId!)
    .eq("seen", false)

  if (data && data.length !== 0) {
    const outputData: UnseenMessages[] = Object.values(
      data.reduce(
        (acc, { ticket_id, seen }) => {
          acc[ticket_id] = acc[ticket_id] || { ticket_id, amount_unseen: 0 }
          if (!seen) {
            acc[ticket_id].amount_unseen += 1
          }
          return acc
        },
        {} as Record<string, UnseenMessages>,
      ),
    )
    return outputData
  }
}

export default getUnreadMessages
