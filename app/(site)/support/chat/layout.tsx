import supabaseServer from "@/libs/supabaseServer"
import { Sidebar } from "./components/Sidebar"
import { redirect } from "next/navigation"

export default async function SupportChatLayout({ children }: { children: React.ReactNode }) {
  const { data: role_response } = await supabaseServer().from("users").select("role").single()

  // boilerplate if you have more roles without aaccess to /support/chat
  // Allow roles in array to visit this page
  // if (!["ADMIN", "SUPPORT"].includes(role_response?.role!)) {
  //   redirect("/")
  // }

  if (role_response?.role === "USER") {
    redirect("/")
  }

  return <Sidebar>{children}</Sidebar>
}
