import supabaseServer from "@/libs/supabaseServer"
import { TicketsList } from "./components/TicketsList"
import { redirect } from "next/navigation"

export default async function SupportChatLayout({ children }: { children: React.ReactNode }) {
  const { data: role_response, error: anonymous_user } = await supabaseServer().from("users").select("role").single()

  if (role_response?.role === "USER" || anonymous_user) {
    // boilerplate if you have more roles without access to /support/chat
    // Allow roles in array to visit this page
    // if (!["ADMIN", "SUPPORT"].includes(role_response?.role!)) {
    //   redirect("/")
    // }

    redirect("/")
  }

  return <TicketsList>{children}</TicketsList>
}
