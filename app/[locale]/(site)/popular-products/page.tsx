import Link from "next/link"

import { fetchPopularProducts } from "@/libs/popularProducts"
import { PopularProductsPreviewList } from "../components/PopularProductsPreviewList"

interface PopularProductsPageProps {
  params: { locale: string }
  searchParams: {
    page?: string
    perPage?: string
  }
}

export default async function PopularProductsPage({ params, searchParams }: PopularProductsPageProps) {
  const page = Number(searchParams.page) || 1
  const perPage = Number(searchParams.perPage) || 24
  const { products, totalItems, totalPages } = await fetchPopularProducts({ page, perPage })

  return (
    <div className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-6xl flex-col gap-8 px-4 py-12">
      <section className="rounded-[32px] border border-success/20 bg-gradient-to-br from-success/10 via-background to-background p-6 shadow-2xl shadow-success/10">
        <div className="flex flex-col gap-4 laptop:flex-row laptop:items-end laptop:justify-between">
          <div className="flex max-w-3xl flex-col gap-3">
            <div className="inline-flex w-fit items-center rounded-full border border-success/30 bg-success/10 px-3 py-1 text-sm font-medium text-success">
              Demo ready collection
            </div>
            <h1 className="text-4xl font-semibold tracking-tight text-title">Popular products preview</h1>
            <p className="text-base leading-7 text-subTitle">
              This page gives customers a clean preview of the top catalog items before they jump into the AI assistant.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-sm text-subTitle">
            <span>{totalItems} items available</span>
            <span>{perPage} per page</span>
            <Link
              href={`/${params.locale}`}
              className="rounded-full border border-success/30 px-4 py-2 font-semibold text-success transition-colors duration-300 hover:border-success hover:bg-success hover:text-black">
              Back to shop
            </Link>
          </div>
        </div>
      </section>

      <PopularProductsPreviewList
        products={products}
        locale={params.locale}
        showHeader={false}
      />

      <div className="flex flex-col gap-4 rounded-2xl border border-border-color/20 bg-background/70 p-4 mobile:flex-row mobile:items-center mobile:justify-between">
        <div className="text-sm text-subTitle">
          Page {page} of {totalPages}
        </div>

        <div className="flex items-center gap-3">
          <Link
            href={`/${params.locale}/popular-products?page=${Math.max(1, page - 1)}&perPage=${perPage}`}
            className={`rounded-full border px-4 py-2 text-sm font-semibold transition-colors duration-300 ${
              page <= 1
                ? "pointer-events-none border-border-color/20 text-subTitle/50"
                : "border-success/30 text-success hover:border-success hover:bg-success hover:text-black"
            }`}>
            Previous
          </Link>

          <Link
            href={`/${params.locale}/popular-products?page=${Math.min(totalPages, page + 1)}&perPage=${perPage}`}
            className={`rounded-full border px-4 py-2 text-sm font-semibold transition-colors duration-300 ${
              page >= totalPages
                ? "pointer-events-none border-border-color/20 text-subTitle/50"
                : "border-success/30 text-success hover:border-success hover:bg-success hover:text-black"
            }`}>
            Next
          </Link>
        </div>
      </div>
    </div>
  )
}
