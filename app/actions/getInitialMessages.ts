import supabaseServer from "@/libs/supabaseServer"
import { getCookie } from "@/utils/helpersSSR"

const getInitialMessages = async () => {
  //get userId to fetch messages by userId
  const { data: userSessionData, error: userSessionError } = await supabaseServer().auth.getSession()

  if (userSessionError) {
    console.log(10, "userSessionError - ", userSessionError)
    throw new Error("getConversationId error - ", userSessionError)
  }

  const userId =
    userSessionData.session?.user.id === undefined ? getCookie("anonymousId")?.value : userSessionData.session?.user.id

  // fetch messages by userId
  const { data: messages, error } = await supabaseServer()
    .from("messages")
    .select("*")
    .eq("sender_id", userId as string)
  if (error) {
    console.log(22, "error - ", error)
    throw error
  }
  return messages
}

export default getInitialMessages
