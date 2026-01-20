import { redirect } from "next/navigation"
import supabaseServer from "@/libs/supabase/supabaseServer"

import getInitialTickets from "@/actions/getInitialTickets"
import getUnreadMessages from "@/actions/getUnreadMessages"
import Navbar from "@/components/Navbar/Navbar"
import { DesktopSidebar, MobileSidebar } from "./components"
import ClientOnly from "@/components/ClientOnly"

export const dynamic = "force-dynamic"

export default async function SupportChatLayout({ children }: { children: React.ReactNode }) {
  const { data: role_response, error: anonymous_user } = await supabaseServer().from("users").select("role").single()
  const initialTickets = await getInitialTickets()
  const unreadMessages = await getUnreadMessages()

  if (role_response?.role === "USER" || anonymous_user) {
    // boilerplate if you have more roles without access to /support/chat
    // Allow roles in array to visit this page
    // if (!["ADMIN", "SUPPORT"].includes(role_response?.role!)) {
    //   redirect("/")
    // }

    redirect("/")
  }

  return (
    <>
      <ClientOnly>
        <Navbar />
        <div className="flex flex-row h-[calc(100vh-64px)]">
          <DesktopSidebar unseenMessages={unreadMessages ?? []} initialTickets={initialTickets} />
          <MobileSidebar unseenMessages={unreadMessages ?? []} initialTickets={initialTickets} />
          {children}
        </div>
      </ClientOnly>
    </>
  )
}
