import { ProductTranslations } from "@/ts/product/TProductDB"

type SearchableProduct = {
  translations: ProductTranslations
  variants?: { label: string }[] | null
}

function normalizeSearchText(value: string) {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
}

function tokenizeSearchText(value: string) {
  const normalizedValue = normalizeSearchText(value)

  if (!normalizedValue) return []

  return normalizedValue.split(/\s+/).filter(Boolean)
}

function createSearchableText(product: SearchableProduct) {
  return [
    ...Object.values(product.translations).flatMap(translation => [translation.title, translation.description]),
    ...(product.variants?.map(variant => variant.label) ?? []),
  ]
    .map(value => value.trim())
    .filter(Boolean)
    .join(" ")
}

export function productMatchesSearchQuery(product: SearchableProduct, query: string) {
  const normalizedQuery = normalizeSearchText(query)
  const queryTokens = tokenizeSearchText(query)
  if (!normalizedQuery || queryTokens.length === 0) return true

  const searchableText = normalizeSearchText(createSearchableText(product))
  if (!searchableText) return false
  if (searchableText.includes(normalizedQuery)) return true

  const productTokens = searchableText.split(/\s+/).filter(Boolean)
  if (productTokens.length === 0) return false

  return queryTokens.every(queryToken =>
    productTokens.some(productToken => productToken.startsWith(queryToken) || productToken.includes(queryToken)),
  )
}

export function filterProductsBySearchQuery<T extends SearchableProduct>(products: T[], query: string) {
  return products.filter(product => productMatchesSearchQuery(product, query))
}
