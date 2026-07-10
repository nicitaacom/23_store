import { TProductTranslation, TProductTranslations, TProductDB } from "@/ts/product/TProductDB"

export const PRODUCT_LOCALES = ["en", "fi", "ru", "se"] as const

export type TProductLocale = keyof TProductTranslations

const EMPTY_TRANSLATION: TProductTranslation = {
  title: "",
  description: "",
}

function getNormalizedTranslationField(value: unknown) {
  return typeof value === "string" ? value.trim() : ""
}

function getFirstAvailableTranslation(
  candidate: Partial<Record<TProductLocale, Partial<TProductTranslation> | null | undefined>>,
) {
  for (const locale of PRODUCT_LOCALES) {
    const translation = candidate[locale]
    const title = getNormalizedTranslationField(translation?.title)
    const description = getNormalizedTranslationField(translation?.description)

    if (title || description) {
      return {
        title,
        description,
      } satisfies TProductTranslation
    }
  }

  return EMPTY_TRANSLATION
}

export function toProductLocale(locale: string): TProductLocale {
  return PRODUCT_LOCALES.includes(locale as TProductLocale) ? (locale as TProductLocale) : "fi"
}

export function createRawProductTranslations(title: string, description: string): TProductTranslations {
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

export function normalizeProductTranslations(value: unknown): TProductTranslations {
  if (!value || typeof value !== "object") {
    return createRawProductTranslations("", "")
  }

  const candidate = value as Partial<Record<TProductLocale, Partial<TProductTranslation> | null | undefined>>
  const fallback = getFirstAvailableTranslation(candidate)

  return {
    en: {
      title: getNormalizedTranslationField(candidate.en?.title) || fallback.title || EMPTY_TRANSLATION.title,
      description:
        getNormalizedTranslationField(candidate.en?.description) || fallback.description || EMPTY_TRANSLATION.description,
    },
    fi: {
      title: getNormalizedTranslationField(candidate.fi?.title) || fallback.title || EMPTY_TRANSLATION.title,
      description:
        getNormalizedTranslationField(candidate.fi?.description) || fallback.description || EMPTY_TRANSLATION.description,
    },
    ru: {
      title: getNormalizedTranslationField(candidate.ru?.title) || fallback.title || EMPTY_TRANSLATION.title,
      description:
        getNormalizedTranslationField(candidate.ru?.description) || fallback.description || EMPTY_TRANSLATION.description,
    },
    se: {
      title: getNormalizedTranslationField(candidate.se?.title) || fallback.title || EMPTY_TRANSLATION.title,
      description:
        getNormalizedTranslationField(candidate.se?.description) || fallback.description || EMPTY_TRANSLATION.description,
    },
  }
}

export function getProductGalleryImages(product: Pick<TProductDB, "img_url">) {
  const images = normalizeProductImageUrls(product.img_url)
  return images.length ? images : ["/placeholder.jpg"]
}

export function getProductPrimaryImageUrl(product: Pick<TProductDB, "img_url">) {
  return getProductGalleryImages(product)[0]
}

export function sortProductsByLocale<T extends { translations: TProductTranslations }>(
  products: T[],
  locale: TProductLocale = "fi",
) {
  return [...products].sort((productA, productB) => {
    const left = productA.translations[locale]?.title || productA.translations.fi.title
    const right = productB.translations[locale]?.title || productB.translations.fi.title

    return left.localeCompare(right, locale)
  })
}
