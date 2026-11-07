import type { TProductDB, TProductTranslations } from "@/ts/product/TProductDB"

const LOCALES = ["en", "fi", "ru", "se"] as const

// A price response is the whole row from the moment that request finished reading.
// Writing that whole row over a title stored while the price request was still open puts the old title back.
export function confirmPrice(current: TProductDB, confirmed: TProductDB): TProductDB {
  return {
    ...current,
    price: confirmed.price,
    price_id: confirmed.price_id,
    ai_price_baseline: confirmed.ai_price_baseline,
  }
}

function localeText(current: TProductTranslations, confirmed: TProductTranslations | undefined, locale: (typeof LOCALES)[number], key: "title" | "description") {
  const currentLocale = current[locale] ?? { title: "", description: "" }
  const confirmedValue = confirmed?.[locale]?.[key]
  return confirmedValue || currentLocale[key]
}

function confirmLocaleTitle(current: TProductTranslations, confirmed: TProductTranslations | undefined): TProductTranslations {
  const next = { ...current }
  for (const locale of LOCALES) {
    const currentLocale = current[locale] ?? { title: "", description: "" }
    next[locale] = { ...currentLocale, title: localeText(current, confirmed, locale, "title") }
  }
  return next
}

function confirmLocaleDescription(current: TProductTranslations, confirmed: TProductTranslations | undefined): TProductTranslations {
  const next = { ...current }
  for (const locale of LOCALES) {
    const currentLocale = current[locale] ?? { title: "", description: "" }
    next[locale] = { ...currentLocale, description: localeText(current, confirmed, locale, "description") }
  }
  return next
}

// A title response includes the price from the moment that request read the row.
// Writing the whole row puts an older price back over the price already stored.
export function confirmTitle(current: TProductDB, confirmed: TProductDB): TProductDB {
  return {
    ...current,
    translations: confirmLocaleTitle(current.translations, confirmed?.translations),
  }
}

export function confirmDescription(current: TProductDB, confirmed: TProductDB): TProductDB {
  return {
    ...current,
    translations: confirmLocaleDescription(current.translations, confirmed?.translations),
  }
}

export function confirmStock(current: TProductDB, confirmed: TProductDB): TProductDB {
  return { ...current, on_stock: confirmed.on_stock }
}

export function confirmCategory(current: TProductDB, confirmed: TProductDB): TProductDB {
  return { ...current, category_id: confirmed.category_id }
}

export function confirmVariants(current: TProductDB, confirmed: TProductDB): TProductDB {
  return { ...current, variants: confirmed.variants, on_stock: confirmed.on_stock }
}

export function confirmImages(current: TProductDB, confirmed: TProductDB): TProductDB {
  return { ...current, img_url: confirmed.img_url }
}

export function confirmPersonalization(current: TProductDB, confirmed: TProductDB): TProductDB {
  return { ...current, personalization: confirmed.personalization }
}

const revisionByField = new Map<string, number>()

export function claimFieldRevision(ownerId: string, field: string) {
  const key = `${ownerId}:${field}`
  const revision = (revisionByField.get(key) ?? 0) + 1
  revisionByField.set(key, revision)
  return revision
}

export function isLatestFieldRevision(ownerId: string, field: string, revision: number) {
  return revisionByField.get(`${ownerId}:${field}`) === revision
}
