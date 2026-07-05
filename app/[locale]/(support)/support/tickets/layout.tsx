import { redirect } from "next/navigation"
import supabaseServer from "@/libs/supabase/supabaseServer"

import getInitialTickets from "@/actions/getInitialTickets"
import getUnreadMessages from "@/actions/getUnreadMessages"
import Navbar from "@/components/Navbar/Navbar"
import { SupportTicketsSidebar } from "./components"
import ClientOnly from "@/components/ClientOnly"

export const dynamic = "force-dynamic"

export default async function SupportChatLayout({ children }: { children: React.ReactNode }) {
  const supabase = await supabaseServer()
  const { data: role_response, error: anonymous_user } = await supabase.from("23_users").select("roles").single()
  const initialTickets = await getInitialTickets()
  const unreadMessages = await getUnreadMessages()

  const roles: string[] = role_response?.roles ?? []
  if (!roles.includes("SUPPORT") || anonymous_user) {
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
        <div className="pt-16">
          <Navbar />
          <div className="flex h-[calc(100vh-64px)] min-h-0 bg-background px-2 pb-2 pt-2 laptop:gap-4 laptop:px-4 laptop:pb-4">
            <SupportTicketsSidebar unseenMessages={unreadMessages ?? []} initialTickets={initialTickets} />
            <div className="flex min-w-0 flex-1">{children}</div>
          </div>
        </div>
      </ClientOnly>
    </>
  )
}
