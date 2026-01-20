// locales/config.ts
export const localeLoaders = {
  en: () => import("./en"),
  fi: () => import("./fi"),
  ru: () => import("./ru"),
  se: () => import("./se"),
} as const
