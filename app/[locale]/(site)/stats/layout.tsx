import { Metadata } from "next"
import { redirect } from "next/navigation"

import supabaseServer from "@/libs/supabase/supabaseServer"

export const metadata: Metadata = {
  title: "Hot Delivery - utm stats",
  description: "Dashboard for utm stats on hot-delivery.net - we deliver you order as fresh as possible",
}

export default async function UTMLayout({ children }: { children: React.ReactNode }) {
  const supabase = await supabaseServer()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user?.id) {
    redirect("/")
  }

  const { data: roleRows, error: roleError } = await supabase
    .from("23_users")
    .select("roles")
    .eq("id", user.id)
    .order("created_at", { ascending: true })

  const roles: string[] = roleRows?.[0]?.roles ?? []
  if (roleError || !roles.includes("ADMIN")) {
    redirect("/")
  }

  return <>{children}</>
}
