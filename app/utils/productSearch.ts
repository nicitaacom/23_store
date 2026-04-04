import { ProductTranslations } from "@/ts/product/TProductDB"

type SearchableProduct = {
  translations: ProductTranslations
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

export function productMatchesSearchQuery(product: SearchableProduct, query: string) {
  const queryTokens = tokenizeSearchText(query)
  if (queryTokens.length === 0) return true

  const searchableText = Object.values(product.translations)
    .map(translation => `${translation.title} ${translation.description}`)
    .join(" ")
  const productTokens = tokenizeSearchText(searchableText)
  if (productTokens.length === 0) return false

  return queryTokens.every(queryToken => productTokens.some(productToken => productToken.startsWith(queryToken)))
}

export function filterProductsBySearchQuery<T extends SearchableProduct>(products: T[], query: string) {
  return products.filter(product => productMatchesSearchQuery(product, query))
}
