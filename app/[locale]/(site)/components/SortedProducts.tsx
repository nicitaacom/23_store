"use client"

import { useEffect, useMemo, useState } from "react"

import { TProductDB } from "@/ts/product/TProductDB"
import Products from "./Products"

const ANON_VIEWS_KEY = "23_category_views_anon"

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
}

export function SortedProducts({ products, serverViews }: SortedProductsProps) {
  const [anonViews, setAnonViews] = useState<Record<string, number>>({})
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    if (Object.keys(serverViews).length > 0) return // auth path — serverViews already populated
    try {
      const raw = localStorage.getItem(ANON_VIEWS_KEY)
      if (raw) setAnonViews(JSON.parse(raw))
    } catch { /* ignore */ }
    setMounted(true)
  }, [serverViews])

  const sorted = useMemo(() => {
    if (Object.keys(serverViews).length > 0) return sortByViews(products, serverViews)
    if (!mounted) return products
    return sortByViews(products, anonViews)
  }, [products, serverViews, anonViews, mounted])

  return <Products products={sorted} />
}
