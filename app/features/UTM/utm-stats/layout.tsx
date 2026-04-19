import { Metadata } from "next"
import { redirect } from "next/navigation"

import supabaseServer from "@/libs/supabase/supabaseServer"
import Navbar from "@/components/Navbar/Navbar"

export const metadata: Metadata = {
  title: "Hot Delivery - utm stats",
  description: "Dashboard for utm stats on hot-delivery.net - we deliver you order as fresh as possible",
}

export default async function UTMLayout({ children }: { children: React.ReactNode }) {
  const {
    data: { user },
  } = await supabaseServer().auth.getUser()

  if (!user?.id) {
    redirect("/")
  }

  const { data: roleRows, error: roleError } = await supabaseServer()
    .from("23_users")
    .select("role")
    .eq("id", user.id)
    .order("created_at", { ascending: true })

  if (roleError || roleRows?.[0]?.role !== "ADMIN") {
    redirect("/")
  }

  return (
    <>
      <Navbar />
      {children}
    </>
  )
}
