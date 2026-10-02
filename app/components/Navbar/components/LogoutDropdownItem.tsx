"use client"

import { BiLogOut } from "react-icons/bi"

import supabaseClient from "@/libs/supabase/supabaseClient"
import { useCurrentLocale, useI18n } from "@/locales/client"
import useToast from "@/store/ui/useToast"
import useUser from "@/store/user/useUser"
import { DropdownItem } from "@/components/ui/DropdownItem"

// http://localhost:6006/?path=/story/navigation-navbar--anonymous
export function LogoutDropdownItem() {
  const locale = useCurrentLocale()
  const t = useI18n()
  const toast = useToast()
  const userStore = useUser()

  async function logout() {
    const { error } = await supabaseClient.auth.signOut()
    if (error) {
      console.error("Sign out failed", error)
      toast.show("error", t("auth.logout_failed_title"), t("auth.logout_failed_body"))
      return
    }
    userStore.logoutUser()
    window.location.replace(`/${locale}`)
  }

  return <DropdownItem label="Logout" icon={BiLogOut} onClick={logout} />
}
