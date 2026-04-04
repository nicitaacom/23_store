type SearchableProduct = {
  title: string
  sub_title: string
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

  const productTokens = tokenizeSearchText(`${product.title} ${product.sub_title}`)
  if (productTokens.length === 0) return false

  return queryTokens.every(queryToken => productTokens.some(productToken => productToken.startsWith(queryToken)))
}

export function filterProductsBySearchQuery<T extends SearchableProduct>(products: T[], query: string) {
  return products.filter(product => productMatchesSearchQuery(product, query))
}
