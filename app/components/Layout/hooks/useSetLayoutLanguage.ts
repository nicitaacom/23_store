import { useEffect } from "react"

import type { TLocaleTag } from "@/ts/types/i18n/TLocaleTag"
import { getLocalePath, TEMPORARY_LOCALE_OVERRIDE_SESSION_KEY } from "@/utils/locale"
import { useCurrentLocale } from "@/locales/client"

export function useSetLayoutLanguage(userId: string | null, preferredLanguage: TLocaleTag | null) {
  const locale = useCurrentLocale()

  useEffect(() => {
    try {
      if (!userId || preferredLanguage === locale) {
        window.sessionStorage.removeItem(TEMPORARY_LOCALE_OVERRIDE_SESSION_KEY)
      } else {
        const temporaryLocaleOverride = window.sessionStorage.getItem(TEMPORARY_LOCALE_OVERRIDE_SESSION_KEY)
        if (temporaryLocaleOverride === locale) return
        if (temporaryLocaleOverride) window.sessionStorage.removeItem(TEMPORARY_LOCALE_OVERRIDE_SESSION_KEY)
      }
    } catch (error) {
      console.error("The browser language preference could not be read.", error)
    }

    if (!userId || !preferredLanguage || preferredLanguage === locale) return

    const { pathname, search, hash } = window.location
    window.location.replace(`${getLocalePath(preferredLanguage, pathname)}${search}${hash}`)
  }, [locale, preferredLanguage, userId])
}
