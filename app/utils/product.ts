import { ProductTranslation, ProductTranslations, TProductDB } from "@/ts/product/TProductDB"

export const PRODUCT_LOCALES = ["en", "fi", "ru", "se"] as const

export type ProductLocale = keyof ProductTranslations

const EMPTY_TRANSLATION: ProductTranslation = {
  title: "",
  description: "",
}

export function toProductLocale(locale: string): ProductLocale {
  return PRODUCT_LOCALES.includes(locale as ProductLocale) ? (locale as ProductLocale) : "fi"
}

export function createRawProductTranslations(title: string, description: string): ProductTranslations {
  return {
    en: { title, description },
    fi: { title, description },
    ru: { title, description },
    se: { title, description },
  }
}

export function normalizeProductTranslations(value: unknown): ProductTranslations {
  if (!value || typeof value !== "object") {
    return createRawProductTranslations("", "")
  }

  const candidate = value as Partial<Record<ProductLocale, Partial<ProductTranslation> | null | undefined>>
  const fallback = candidate.fi

  return {
    en: {
      title: candidate.en?.title ?? fallback?.title ?? EMPTY_TRANSLATION.title,
      description: candidate.en?.description ?? fallback?.description ?? EMPTY_TRANSLATION.description,
    },
    fi: {
      title: candidate.fi?.title ?? EMPTY_TRANSLATION.title,
      description: candidate.fi?.description ?? EMPTY_TRANSLATION.description,
    },
    ru: {
      title: candidate.ru?.title ?? fallback?.title ?? EMPTY_TRANSLATION.title,
      description: candidate.ru?.description ?? fallback?.description ?? EMPTY_TRANSLATION.description,
    },
    se: {
      title: candidate.se?.title ?? fallback?.title ?? EMPTY_TRANSLATION.title,
      description: candidate.se?.description ?? fallback?.description ?? EMPTY_TRANSLATION.description,
    },
  }
}

export const pt = (product: TProductDB, locale: ProductLocale) =>
  product.translations[locale] ?? product.translations.fi

export function sortProductsByLocale<T extends { translations: ProductTranslations }>(products: T[], locale: ProductLocale = "fi") {
  return [...products].sort((a, b) => {
    const left = a.translations[locale]?.title || a.translations.fi.title
    const right = b.translations[locale]?.title || b.translations.fi.title

    return left.localeCompare(right, locale)
  })
}
