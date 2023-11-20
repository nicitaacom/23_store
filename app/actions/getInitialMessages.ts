import supabaseAdmin from "@/libs/supabaseAdmin"
import supabaseServer from "@/libs/supabaseServer"
import { getCookie } from "@/utils/helpersSSR"

const getInitialMessages = async () => {
  //get userId to fetch messages by userId
  const {
    data: { user },
    error: user_error,
  } = await supabaseServer().auth.getUser()

  if (user_error) {
    console.log(10, "userSessionError - ", user_error)
    throw new Error("getTicketId error - ", user_error)
  }

  const userId = user?.id === undefined ? getCookie("anonymousId")?.value : user.id

  // get messages by userId
  const { data: messages, error } = await supabaseAdmin // because may be anonymousId that not matches RLS (sender_id = auth.uid())
    .from("messages")
    .select("*")
    .eq("sender_id", userId as string)
  if (error) {
    console.log(22, "error - ", error)
    throw error
  }
  if (messages && messages.length === 0) {
    return null
  }
  return messages
}

export default getInitialMessages
