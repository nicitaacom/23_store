import { TAdminProductSort, ADMIN_PRODUCT_SORTS } from "@/ts/types/TAdminProductSort"
import { TProductDB } from "@/ts/product/TProductDB"
import { TProductLocale } from "@/utils/product"

const PLACEHOLDER_IMAGE_PATHS = ["/placeholder.jpg", "/no-image-fallback.png"]

export function hasRealProductImage(product: Pick<TProductDB, "img_url">) {
  return product.img_url.some(imageUrl => {
    const normalizedUrl = imageUrl.trim().toLowerCase()
    if (!normalizedUrl) return false

    try {
      const pathname = new URL(normalizedUrl, "https://local.invalid").pathname
      return !PLACEHOLDER_IMAGE_PATHS.some(placeholderPath => pathname.endsWith(placeholderPath))
    } catch {
      const path = normalizedUrl.split(/[?#]/, 1)[0]
      return !PLACEHOLDER_IMAGE_PATHS.some(placeholderPath => path.endsWith(placeholderPath))
    }
  })
}

function compareCreatedAt(productA: TProductDB, productB: TProductDB, direction: "asc" | "desc") {
  if (!productA.created_at && !productB.created_at) return 0
  if (!productA.created_at) return 1
  if (!productB.created_at) return -1

  const comparison = productA.created_at.localeCompare(productB.created_at)
  return direction === "asc" ? comparison : -comparison
}

function getLocalizedTitle(product: TProductDB, locale: TProductLocale) {
  return product.translations[locale]?.title || product.translations.en?.title || product.id
}

export function sortAdminProducts(products: TProductDB[], sort: TAdminProductSort, locale: TProductLocale) {
  const collator = new Intl.Collator(locale, { numeric: true, sensitivity: "base" })

  return [...products].sort((productA, productB) => {
    const imageComparison = Number(hasRealProductImage(productA)) - Number(hasRealProductImage(productB))
    if (imageComparison !== 0) return imageComparison

    let comparison = 0

    if (sort === ADMIN_PRODUCT_SORTS.createdDesc) comparison = compareCreatedAt(productA, productB, "desc")
    if (sort === ADMIN_PRODUCT_SORTS.createdAsc) comparison = compareCreatedAt(productA, productB, "asc")
    if (sort === ADMIN_PRODUCT_SORTS.priceAsc) comparison = productA.price - productB.price
    if (sort === ADMIN_PRODUCT_SORTS.priceDesc) comparison = productB.price - productA.price
    if (sort === ADMIN_PRODUCT_SORTS.nameAsc) {
      comparison = collator.compare(getLocalizedTitle(productA, locale), getLocalizedTitle(productB, locale))
    }
    if (sort === ADMIN_PRODUCT_SORTS.nameDesc) {
      comparison = collator.compare(getLocalizedTitle(productB, locale), getLocalizedTitle(productA, locale))
    }

    return comparison || productA.id.localeCompare(productB.id)
  })
}
