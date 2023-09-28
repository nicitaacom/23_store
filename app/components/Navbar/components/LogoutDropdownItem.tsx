"use client"

import { useRouter } from "next/navigation"

import supabaseClient from "@/utils/supabaseClient"
import { BiLogOut } from "react-icons/bi"

import { DropdownItem } from "@/components/ui/DropdownItem"

export default function LogoutDropdownItem() {
  const router = useRouter()
  async function logout() {
    await supabaseClient.auth.signOut()
    router.refresh()
  }
  return <DropdownItem label="Logout" icon={BiLogOut} onClick={logout} />
}
