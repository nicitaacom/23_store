import { redirect } from "next/navigation"
import supabaseServer from "@/libs/supabaseServer"

import getTickets from "@/actions/getTickets"
import getLastMessages from "@/actions/getLastMessages"
import { DesktopSidebar, MobileSidebar } from "./components"

export default async function SupportChatLayout({ children }: { children: React.ReactNode }) {
  const { data: role_response, error: anonymous_user } = await supabaseServer().from("users").select("role").single()
  const tickets = await getTickets()

  const last_messages = await getLastMessages()
  // TODO - getAmountOfUnreadMessages()

  if (role_response?.role === "USER" || anonymous_user) {
    // boilerplate if you have more roles without access to /support/chat
    // Allow roles in array to visit this page
    // if (!["ADMIN", "SUPPORT"].includes(role_response?.role!)) {
    //   redirect("/")
    // }

    redirect("/")
  }

  return (
    <div className="relative h-[calc(100vh-64px)] flex">
      <DesktopSidebar tickets={tickets} last_messages={last_messages ?? []} />
      <MobileSidebar tickets={tickets} />
      {children}
    </div>
  )
}
