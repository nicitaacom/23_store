import supabaseServer from "@/libs/supabaseServer"
import { redirect } from "next/navigation"
import getTickets from "@/actions/getTickets"
import { DesktopSidebar, MobileSidebar } from "./components"

export default async function SupportChatLayout({ children }: { children: React.ReactNode }) {
  const { data: role_response, error: anonymous_user } = await supabaseServer().from("users").select("role").single()
  const tickets = await getTickets()

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
      <DesktopSidebar />
      <MobileSidebar tickets={tickets} />
      <main className="hidden laptop:flex w-[calc(100%-16rem)] h-full">{children}</main>
    </div>
  )
}
