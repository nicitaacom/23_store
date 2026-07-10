"use client"

import { useRouter } from "next/navigation"
import { BiLogOut } from "react-icons/bi"

import supabaseClient from "@/libs/supabase/supabaseClient"
import useUser from "@/store/user/useUser"
import { DropdownItem } from "@/components/ui/DropdownItem"

export function LogoutDropdownItem() {
  const router = useRouter()
  const userStore = useUser()

  async function logout() {
    await supabaseClient.auth.signOut()
    userStore.logoutUser()
    router.refresh()
  }

  return <DropdownItem label="Logout" icon={BiLogOut} onClick={logout} />
}
