import { TProductDB } from "@/ts/product/TProductDB"
import { isProductInStock } from "@/utils/productVariants"

export function sortCatalogProducts(products: TProductDB[], views: Record<string, number>, searchQuery = "") {
  if (searchQuery.trim()) return products

  const categoryRanks = new Map(
    Object.entries(views).sort(([, left], [, right]) => right - left).map(([id], index) => [id, index]),
  )

  return [...products].sort((left, right) => {
    const stockOrder = Number(isProductInStock(right)) - Number(isProductInStock(left))
    if (stockOrder) return stockOrder
    if (categoryRanks.size === 0) return 0

    const leftRank = categoryRanks.get(left.category_id ?? "") ?? Infinity
    const rightRank = categoryRanks.get(right.category_id ?? "") ?? Infinity
    if (leftRank !== rightRank) return leftRank - rightRank
    return (left.price ?? 0) - (right.price ?? 0)
  })
}
