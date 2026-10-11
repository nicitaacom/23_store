import type { TLocaleTag } from "@/ts/types/i18n/TLocaleTag"
import { localeLoaders } from "@/locales/config"

export function isLocaleTag(locale: unknown): locale is TLocaleTag {
  return typeof locale === "string" && Object.hasOwn(localeLoaders, locale)
}

export function getLocalePath(locale: TLocaleTag, pathname: string) {
  const localePrefix = new RegExp(`^/(${Object.keys(localeLoaders).join("|")})(?=/|$)`)
  return `/${locale}${pathname.replace(localePrefix, "") || "/"}`
}
