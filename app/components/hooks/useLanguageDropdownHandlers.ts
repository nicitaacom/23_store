import { useState } from "react"
import type { MouseEvent } from "react"

import type { TLocaleTag } from "@/ts/types/i18n/TLocaleTag"
import { accountSDK } from "@/sdk/AccountSDK/AccountSDK"
import useUser from "@/store/user/useUser"
import { TEMPORARY_LOCALE_OVERRIDE_SESSION_KEY } from "@/utils/locale"

export function useLanguageDropdownHandlers() {
  const [isLocalLoading, setIsLocalLoading] = useState(false)

  function handleChangeLanguage(e: MouseEvent<HTMLAnchorElement>, language: TLocaleTag) {
    e.preventDefault()
    if (isLocalLoading) return

    const href = e.currentTarget.href
    const isAuthenticated = Boolean(useUser.getState().user)
    setIsLocalLoading(true)
    try {
      window.sessionStorage.setItem(TEMPORARY_LOCALE_OVERRIDE_SESSION_KEY, language)
    } catch (error) {
      console.error("The browser did not store the selected language for this tab.", error)
    }

    if (isAuthenticated) {
      void accountSDK.updateLanguage(language).catch(error => {
        console.error("Could not save the account language preference; keeping the selected locale for this tab.", error)
      })
    }

    window.location.assign(href)
  }

  return { handleChangeLanguage, isLocalLoading }
}
