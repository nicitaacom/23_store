const INTL_LOCALES: Record<string, string> = {
  en: "en-US",
  fi: "fi-FI",
  ru: "ru-RU",
  se: "sv-SE",
}

export function formatCurrency(number: number, locale?: string) {
  return new Intl.NumberFormat(locale ? (INTL_LOCALES[locale] ?? locale) : undefined, {
    currency: "USD",
    style: "currency",
  }).format(number)
}
