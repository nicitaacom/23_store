"use client"

import { useRouter } from "next/navigation"

import supabaseClient from "@/libs/supabaseClient"
import { BiLogOut } from "react-icons/bi"

import { DropdownItem } from "@/components/ui/DropdownItem"
import useUserStore from "@/store/user/userStore"

export default function LogoutDropdownItem() {
  const router = useRouter()
  const userStore = useUserStore()

  async function logout() {
    await supabaseClient.auth.signOut()
    userStore.logoutUser()
    router.refresh()
  }
  return <DropdownItem label="Logout" icon={BiLogOut} onClick={logout} />
}
