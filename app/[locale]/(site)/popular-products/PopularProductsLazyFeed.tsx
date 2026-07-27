"use client"

import { useCallback, useState } from "react"

import { TProductDB } from "@/ts/product/TProductDB"
import { PopularProductCard } from "./components/PopularProductCard"
import { productsSDK } from "@/sdk/ProductsSDK/ProductsSDK"
import { useLazyLoading } from "@/hooks/useLazyLoading"

interface PopularProductsLazyFeedProps {
  initialProducts: TProductDB[]
  locale: string
  totalItems: number
}

const STEP = 24
const WINDOW_SIZE = 48

// http://localhost:6006/?path=/story/commerce-catalog--search-form
export function PopularProductsLazyFeed({ initialProducts, locale, totalItems }: PopularProductsLazyFeedProps) {
  const [products, setProducts] = useState(initialProducts)

  const selectPopularProducts = useCallback(async (start: number, end: number) => {
    try {
      return await productsSDK.getPopularProducts(start, end)
    } catch (error) {
      console.error("Failed to fetch popular products", error)
      return []
    }
  }, [])

  const { isFetching, hasNoMoreDataToFetch, currentWindow, topRef, bottomRef } = useLazyLoading({
    step: STEP,
    windowSize: WINDOW_SIZE,
    fetchFunction: selectPopularProducts,
    currentState: products,
    setState: setProducts,
  })

  const visibleProducts = products.slice(currentWindow.startIndex, currentWindow.endIndex)

  if (products.length === 0 && !isFetching) {
    return (
      <section className="rounded-[28px] border border-border-color/20 bg-background/80 p-8 text-center">
        <h2 className="text-2xl font-semibold text-title">No popular products yet</h2>
        <p className="mt-2 text-sm text-subTitle">Once products are added, they will appear here automatically.</p>
      </section>
    )
  }

  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-[24px] border border-border-color/20 bg-background/70 px-4 py-3">
        <div className="text-sm text-subTitle">
          Loaded {products.length} of {totalItems} products
        </div>
        <div className="text-xs uppercase tracking-[0.24em] text-success">Scroll to load more</div>
      </div>

      <div className="h-px" ref={topRef} />

      <div className="grid grid-cols-1 gap-4 mobile:grid-cols-2 laptop:grid-cols-3 desktop:grid-cols-4">
        {visibleProducts.map(product => (
          <PopularProductCard key={product.id} product={product} locale={locale} />
        ))}
      </div>

      {!hasNoMoreDataToFetch && <div className="h-20" ref={bottomRef} />}

      {!hasNoMoreDataToFetch && isFetching && (
        <div className="flex items-center justify-center gap-3 rounded-[24px] border border-success/20 bg-success/5 px-4 py-5 text-sm text-subTitle">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-success/30 border-t-success" />
          Loading more products...
        </div>
      )}

      {hasNoMoreDataToFetch && (
        <div className="rounded-[24px] border border-border-color/20 bg-background/70 px-4 py-4 text-center text-sm text-subTitle">
          You reached the end of the popular products list.
        </div>
      )}
    </section>
  )
}
