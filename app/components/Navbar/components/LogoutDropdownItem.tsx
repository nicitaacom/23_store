"use client"

import { useRouter } from "next/navigation"
import { BiLogOut } from "react-icons/bi"

import { DropdownItem } from "@/components/ui/DropdownItem"
import supabaseClient from "@/libs/supabase/supabaseClient"
import useUserStore from "@/store/user/userStore"

export function LogoutDropdownItem() {
  const router = useRouter()
  const userStore = useUserStore()

  async function logout() {
    await supabaseClient.auth.signOut()
    userStore.logoutUser()
    router.refresh()
  }

  return <DropdownItem label="Logout" icon={BiLogOut} onClick={logout} />
}
