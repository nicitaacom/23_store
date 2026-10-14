import type { TLocaleTag } from "@/ts/types/i18n/TLocaleTag"
import { localeLoaders } from "@/locales/config"

export const TEMPORARY_LOCALE_OVERRIDE_SESSION_KEY = "temporary-locale-override"

export function isLocaleTag(locale: unknown): locale is TLocaleTag {
  return typeof locale === "string" && Object.hasOwn(localeLoaders, locale)
}

export function getLocalePath(locale: TLocaleTag, pathname: string) {
  const localePrefix = new RegExp(`^/(${Object.keys(localeLoaders).join("|")})(?=/|$)`)
  return `/${locale}${pathname.replace(localePrefix, "") || "/"}`
}
