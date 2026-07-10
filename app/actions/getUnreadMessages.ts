import { getUser } from "./getUser"
import { getAnonymousId } from "@/functions/getAnonymousId"
import supabaseAdmin from "@/libs/supabase/supabaseAdmin"

export interface IUnseenMessages {
  ticket_id: string
  amount_unseen: number
}

async function getUnreadMessages() {
  const getUserResp = await getUser()

  const userId = getUserResp?.id ? getUserResp.id : getAnonymousId()

  const { data, error: get_unread_messages_error } = await supabaseAdmin
    .from("23_messages")
    .select("ticket_id,id,seen")
    .not("sender_id", "eq", userId)
    .eq("seen", false)

  if (get_unread_messages_error) {
    console.log(25, "get_unread_messages_error - ", get_unread_messages_error)
    throw get_unread_messages_error
  }

  if (data && data.length !== 0) {
    const outputData: IUnseenMessages[] = Object.values(
      data.reduce(
        (acc, { ticket_id, seen }) => {
          acc[ticket_id] = acc[ticket_id] || { ticket_id, amount_unseen: 0 }
          if (!seen) {
            acc[ticket_id].amount_unseen += 1
          }
          return acc
        },
        {} as Record<string, IUnseenMessages>,
      ),
    )
    return outputData
  }
}

export default getUnreadMessages
