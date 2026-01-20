// locales/client.ts
"use client"

import { createI18nClient } from "next-international/client"
import { localeLoaders } from "./config"

export const { useI18n, useScopedI18n, I18nProviderClient } = createI18nClient(localeLoaders)

export const { useChangeLocale, useCurrentLocale } = createI18nClient(localeLoaders)
