"use client"

import { useMemo } from "react"

import { TProductDB } from "@/ts/product/TProductDB"
import { useHasMounted } from "@/hooks/useHasMounted"
import Products from "./Products"
import { useAnonCategoryViewsStore } from "@/store/categories/useAnonCategoryViewsStore"

function sortByViews(products: TProductDB[], views: Record<string, number>) {
  const topIds = Object.entries(views)
    .sort(([, a], [, b]) => b - a)
    .map(([id]) => id)

  if (topIds.length === 0) return products

  return [...products].sort((a, b) => {
    const idxA = a.category_id ? topIds.indexOf(a.category_id) : -1
    const idxB = b.category_id ? topIds.indexOf(b.category_id) : -1
    const rankA = idxA === -1 ? Infinity : idxA
    const rankB = idxB === -1 ? Infinity : idxB
    if (rankA !== rankB) return rankA - rankB
    return (a.price ?? 0) - (b.price ?? 0)
  })
}

interface SortedProductsProps {
  products: TProductDB[]
  serverViews: Record<string, number>
  searchQuery?: string
}

export function SortedProducts({ products, serverViews, searchQuery }: SortedProductsProps) {
  const mounted = useHasMounted()
  const { views: anonViews } = useAnonCategoryViewsStore()

  const sorted = useMemo(() => {
    if (searchQuery) return products
    if (Object.keys(serverViews).length > 0) return sortByViews(products, serverViews)
    if (!mounted) return products
    return sortByViews(products, anonViews)
  }, [products, serverViews, anonViews, mounted, searchQuery])

  return <Products products={sorted} />
}
