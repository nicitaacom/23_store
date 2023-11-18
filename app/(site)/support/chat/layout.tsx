import supabaseServer from "@/libs/supabaseServer"
import { Sidebar } from "./components/Sidebar"
import { redirect } from "next/navigation"

export default async function SupportChatLayout({ children }: { children: React.ReactNode }) {
  const { data: role_response } = await supabaseServer().from("users").select("role").single()

  if (!["ADMIN", "SUPPORT"].includes(role_response?.role!)) {
    redirect("/")
  }
  return <Sidebar>{children}</Sidebar>
}
