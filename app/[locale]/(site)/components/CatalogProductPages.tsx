"use client"

import { useSearchParams } from "next/navigation"

import { SortedProducts } from "./SortedProducts"
import PaginationControls from "@/components/PaginationControls"
import ProductsPerPage from "@/components/ProductsPerPage"
import { defaultPerPage, perPage as perPageOptions } from "@/constant/perPage"
import { TProductDB } from "@/ts/product/TProductDB"

interface CatalogProductPagesProps {
  products: TProductDB[]
  serverViews: Record<string, number>
  locale: string
  categoryId: string | null
  searchQuery: string
  emptyLabel: string
}

export function CatalogProductPages({ products, serverViews, locale, categoryId, searchQuery, emptyLabel }: CatalogProductPagesProps) {
  const searchParams = useSearchParams()
  const requestedPerPage = Number(searchParams.get("perPage"))
  const perPage = perPageOptions.includes(requestedPerPage) ? requestedPerPage : defaultPerPage
  const totalPages = Math.max(1, Math.ceil(products.length / perPage))
  const requestedPage = Number(searchParams.get("page")) || 1
  const page = Math.min(Math.max(requestedPage, 1), totalPages)
  const start = (page - 1) * perPage
  const end = Math.min(start + perPage, products.length)

  return (
    <>
      <section
        className="min-h-0 flex-1 pr-1 laptop:overflow-x-hidden laptop:overflow-y-auto laptop:[scrollbar-gutter:stable]"
        key={`${page}:${perPage}:${categoryId ?? ""}:${searchQuery}`}>
        {products.length === 0 ? (
          <div className="flex min-h-full items-center justify-center rounded-[4px] border border-dashed border-success/20 bg-background/60 px-6 py-12 text-center text-base text-subTitle">
            {emptyLabel}
          </div>
        ) : (
          <SortedProducts products={products.slice(start, end)} serverViews={serverViews} searchQuery={searchQuery} />
        )}
      </section>
      <div className="shrink-0 border-t border-success/15 pt-2">
        <div className="flex items-center justify-between gap-2">
          <PaginationControls
            hasNextPage={end < products.length}
            hasPrevPage={start > 0}
            currentPage={page}
            totalPages={totalPages}
            perPage={perPage}
            basePath={`/${locale}`}
            categoryId={categoryId}
            query={searchQuery}
          />
          <ProductsPerPage />
        </div>
      </div>
    </>
  )
}
