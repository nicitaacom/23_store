import { useState } from "react"
import type { MouseEvent } from "react"

import type { TLocaleTag } from "@/ts/types/i18n/TLocaleTag"
import { accountSDK } from "@/sdk/AccountSDK/AccountSDK"
import { useI18n } from "@/locales/client"
import useToast from "@/store/ui/useToast"
import useUser from "@/store/user/useUser"

export function useLanguageDropdownHandlers() {
  const toast = useToast()
  const t = useI18n()
  const [isLocalLoading, setIsLocalLoading] = useState(false)

  async function handleChangeLanguage(e: MouseEvent<HTMLAnchorElement>, language: TLocaleTag) {
    if (!useUser.getState().user) return
    e.preventDefault()
    if (isLocalLoading) return

    const href = e.currentTarget.href
    setIsLocalLoading(true)
    try {
      await accountSDK.updateLanguage(language)
      window.location.assign(href)
    } catch (error) {
      toast.show("error", t("toast.error.title"), error instanceof Error ? error.message : String(error))
    } finally {
      setIsLocalLoading(false)
    }
  }

  return { handleChangeLanguage, isLocalLoading }
}
