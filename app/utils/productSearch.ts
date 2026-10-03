import { TProductTranslations } from "@/ts/product/TProductDB"

type SearchableProduct = {
  translations: TProductTranslations
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

function matchesSearchText(value: string, normalizedQuery: string, queryTokens: string[]) {
  const searchableText = normalizeSearchText(value)
  if (!searchableText) return false
  if (searchableText.includes(normalizedQuery)) return true
  const productTokens = searchableText.split(/\s+/)
  return queryTokens.every(queryToken => productTokens.some(productToken => productToken.startsWith(queryToken)))
}

function getProductSearchRank(product: SearchableProduct, query: string) {
  const normalizedQuery = normalizeSearchText(query)
  const queryTokens = tokenizeSearchText(query)
  if (!normalizedQuery || queryTokens.length === 0) return 1

  const translations = Object.values(product.translations)
  if (translations.some(translation => normalizeSearchText(translation.title).includes(normalizedQuery))) return 3
  if (translations.some(translation => matchesSearchText(translation.title, normalizedQuery, queryTokens))) return 2
  if (product.variants?.some(variant => matchesSearchText(variant.label, normalizedQuery, queryTokens))) return 1
  if (translations.some(translation => matchesSearchText(translation.description, normalizedQuery, queryTokens))) return 0
  return -1
}

export function productMatchesSearchQuery(product: SearchableProduct, query: string) {
  return getProductSearchRank(product, query) >= 0
}

export function filterProductsBySearchQuery<T extends SearchableProduct>(products: T[], query: string) {
  if (!query.trim()) return products
  const rankedProducts = products
    .map(product => ({ product, rank: getProductSearchRank(product, query) }))
    .filter(item => item.rank >= 0)
    .sort((left, right) => right.rank - left.rank)
  const hasNameMatch = rankedProducts.some(item => item.rank > 0)
  return rankedProducts.filter(item => !hasNameMatch || item.rank > 0).map(item => item.product)
}
