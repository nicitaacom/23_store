import supabaseAdmin from "@/libs/supabaseAdmin"
import supabaseServer from "@/libs/supabaseServer"
import { getCookie } from "@/utils/helpersSSR"

const getInitialMessages = async () => {
  //get userId to fetch messages by userId
  const {
    data: { user },
  } = await supabaseServer().auth.getUser()

  const userId = user?.id === undefined ? getCookie("anonymousId")?.value : user.id

  // get messages by userId
  const { data: messages, error: messages_error } = await supabaseAdmin // because may be anonymousId that not matches RLS (sender_id = auth.uid())
    .from("messages")
    .select("*")
    .eq("sender_id", userId as string)
  if (messages_error) {
    console.log(22, "messages_error - ", messages_error)
    throw messages_error
  }
  if (messages && messages.length === 0) {
    return null
  }
  return messages
}

export default getInitialMessages
