import { ProductTranslation, ProductTranslations, TProductDB } from "@/ts/product/TProductDB"

export const PRODUCT_LOCALES = ["en", "fi", "ru", "se"] as const

export type ProductLocale = keyof ProductTranslations

const EMPTY_TRANSLATION: ProductTranslation = {
  title: "",
  description: "",
}

function getNormalizedTranslationField(value: unknown) {
  return typeof value === "string" ? value.trim() : ""
}

function getFirstAvailableTranslation(candidate: Partial<Record<ProductLocale, Partial<ProductTranslation> | null | undefined>>) {
  for (const locale of PRODUCT_LOCALES) {
    const translation = candidate[locale]
    const title = getNormalizedTranslationField(translation?.title)
    const description = getNormalizedTranslationField(translation?.description)

    if (title || description) {
      return {
        title,
        description,
      } satisfies ProductTranslation
    }
  }

  return EMPTY_TRANSLATION
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

export function normalizeProductImageUrls(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return []
  }

  return value.filter((image): image is string => typeof image === "string" && image.trim().length > 0)
}

export function normalizeProductTranslations(value: unknown): ProductTranslations {
  if (!value || typeof value !== "object") {
    return createRawProductTranslations("", "")
  }

  const candidate = value as Partial<Record<ProductLocale, Partial<ProductTranslation> | null | undefined>>
  const fallback = getFirstAvailableTranslation(candidate)

  return {
    en: {
      title: getNormalizedTranslationField(candidate.en?.title) || fallback.title || EMPTY_TRANSLATION.title,
      description: getNormalizedTranslationField(candidate.en?.description) || fallback.description || EMPTY_TRANSLATION.description,
    },
    fi: {
      title: getNormalizedTranslationField(candidate.fi?.title) || fallback.title || EMPTY_TRANSLATION.title,
      description: getNormalizedTranslationField(candidate.fi?.description) || fallback.description || EMPTY_TRANSLATION.description,
    },
    ru: {
      title: getNormalizedTranslationField(candidate.ru?.title) || fallback.title || EMPTY_TRANSLATION.title,
      description: getNormalizedTranslationField(candidate.ru?.description) || fallback.description || EMPTY_TRANSLATION.description,
    },
    se: {
      title: getNormalizedTranslationField(candidate.se?.title) || fallback.title || EMPTY_TRANSLATION.title,
      description: getNormalizedTranslationField(candidate.se?.description) || fallback.description || EMPTY_TRANSLATION.description,
    },
  }
}

export const pt = (product: TProductDB, locale: ProductLocale) =>
  product.translations[locale] ?? product.translations.fi

export function getProductGalleryImages(product: Pick<TProductDB, "img_url">) {
  const images = normalizeProductImageUrls(product.img_url)
  return images.length ? images : ["/placeholder.jpg"]
}

export function getProductPrimaryImageUrl(product: Pick<TProductDB, "img_url">) {
  return getProductGalleryImages(product)[0]
}

export function sortProductsByLocale<T extends { translations: ProductTranslations }>(products: T[], locale: ProductLocale = "fi") {
  return [...products].sort((a, b) => {
    const left = a.translations[locale]?.title || a.translations.fi.title
    const right = b.translations[locale]?.title || b.translations.fi.title

    return left.localeCompare(right, locale)
  })
}
