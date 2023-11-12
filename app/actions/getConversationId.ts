import supabaseAdmin from "@/libs/supabaseAdmin"
import supabaseServer from "@/libs/supabaseServer"
import { getCookie } from "@/utils/helpersSSR"
import { setCookie } from "@/utils/setCookie"

const getConversationId = async () => {
  const { data: userSessionData, error: userSessionError } = await supabaseServer().auth.getSession()

  if (userSessionError) throw new Error("getConversationId error - ", userSessionError)

  const userId =
    userSessionData.session?.user.id === undefined ? getCookie("anonymousId")?.value : userSessionData.session?.user.id

  try {
    const { data, error } = await supabaseAdmin
      .from("messages")
      .select("conversation_id")
      .eq("sender_id", userId as string)
      .eq("is_closed_conversation", false)

    if (error) {
      console.error("Error fetching conversationId - ", error)
      return null
    }

    if (data && data.length > 0) {
      // Return the existing open conversationId
      return data[0].conversation_id
    } else {
      //return value from cookies if no coversationId (I create cookie for coversationId in Layout.tsx)
      return getCookie("conversationId")?.value
    }
  } catch (error) {
    console.error("Error - ", error)
    return null
  }
}

export default getConversationId

/** to mark conversation as closed
 const { data, error } = await supabaseAdmin
  .from("messages")
  .update({ is_closed_conversation: true })
  .eq("sender_id", userSessionData.session?.user.id)
  .eq("conversation_id", "your-conversation-id-here")
  .eq("is_closed_conversation", false);
 */
