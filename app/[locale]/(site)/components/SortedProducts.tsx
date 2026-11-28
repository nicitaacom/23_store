"use client"

import { useMemo } from "react"

import { TProductDB } from "@/ts/product/TProductDB"
import Products from "./Products"
import { useAnonCategoryViewsStore } from "@/store/categories/useAnonCategoryViewsStore"
import { useHasMounted } from "@/hooks/useHasMounted"
import { sortCatalogProducts } from "../functions/sortCatalogProducts"

interface SortedProductsProps {
  products: TProductDB[]
  serverViews: Record<string, number>
  searchQuery?: string
}

export function useSortedCatalogProducts({ products, serverViews, searchQuery }: SortedProductsProps) {
  const mounted = useHasMounted()
  const { views: anonViews } = useAnonCategoryViewsStore()

  return useMemo(() => {
    const views = Object.keys(serverViews).length > 0 ? serverViews : mounted ? anonViews : {}
    return sortCatalogProducts(products, views, searchQuery)
  }, [products, serverViews, anonViews, mounted, searchQuery])
}

// http://localhost:6006/?path=/story/commerce-catalog--search-form
export function SortedProducts(props: SortedProductsProps) {
  return <Products products={useSortedCatalogProducts(props)} />
}
