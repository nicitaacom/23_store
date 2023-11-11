import supabaseServer from "@/libs/supabaseServer"
import { cookies } from "next/headers"

export function getCookie(name: string) {
  const cookieStore = cookies()
  return cookieStore.get(name)
}

const getConversationId = async () => {
  const { data: userSessionData, error: userSessionError } = await supabaseServer().auth.getSession()

  if (userSessionError) throw new Error("getConversationId error - ", userSessionError)
  if (!userSessionData) {
    const anonymousId = getCookie("anonymousId")
    // const { data } = await supabaseServer()
    //   .from("messages")
    //   .select("*")
    //   .eq("sender_id", anonymousId)
    //   .order("price", { ascending: true })
    return anonymousId
  } else {
    return userSessionData.session?.user.id
  }

  // const { data: conversationId, error: conversationError } = await supabaseServer().auth.getSession()

  // return data
}

export default getConversationId
