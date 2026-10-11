import { useEffect } from "react"

import type { TLocaleTag } from "@/ts/types/i18n/TLocaleTag"
import { getLocalePath } from "@/utils/locale"
import { useCurrentLocale } from "@/locales/client"

export function useSetLayoutLanguage(userId: string | null, preferredLanguage: TLocaleTag | null) {
  const locale = useCurrentLocale()

  useEffect(() => {
    if (!userId || !preferredLanguage || preferredLanguage === locale) return

    const { pathname, search, hash } = window.location
    window.location.replace(`${getLocalePath(preferredLanguage, pathname)}${search}${hash}`)
  }, [locale, preferredLanguage, userId])
}
