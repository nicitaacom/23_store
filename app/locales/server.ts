// locales/server.ts
// locales/server.ts
import { createI18nServer } from "next-international/server"

import { localeLoaders } from "./config"

export const { getI18n, getScopedI18n, getStaticParams } = createI18nServer(localeLoaders)

export const { getCurrentLocale } = createI18nServer(localeLoaders)
