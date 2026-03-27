import Link from "next/link"

import { fetchPopularProducts } from "@/libs/popularProducts"
import { PopularProductsLazyFeed } from "./PopularProductsLazyFeed"

interface PopularProductsPageProps {
  params: { locale: string }
}

export default async function PopularProductsPage({ params }: PopularProductsPageProps) {
  const { products, totalItems } = await fetchPopularProducts({ limit: 24 })

  return (
    <div className="mx-auto h-[calc(100vh-64px)] w-full overflow-hidden px-4 py-2 text-title">
      <section className="panel-scroll mx-auto flex h-full w-full max-w-[1800px] flex-col overflow-x-hidden overflow-y-auto rounded-[4px] border border-success/15 bg-gradient-to-br from-success/5 via-background to-background px-4 py-3 shadow-2xl shadow-success/5">
        <section className="mb-4 rounded-[24px] border border-success/20 bg-[radial-gradient(circle_at_top_left,rgba(34,197,94,0.18),transparent_34%),linear-gradient(135deg,rgba(10,14,18,0.98),rgba(17,24,32,0.95))] p-5 laptop:p-6">
          <div className="flex flex-col gap-5 laptop:flex-row laptop:items-end laptop:justify-between">
            <div className="flex max-w-3xl flex-col gap-3">
              <div className="inline-flex w-fit items-center rounded-[4px] border border-success/30 bg-success/10 px-3 py-1 text-sm font-medium text-success">
                Live catalog preview
              </div>
              <h1 className="text-3xl font-semibold tracking-tight text-title laptop:text-4xl">Popular products preview</h1>
              <p className="max-w-2xl text-base leading-7 text-subTitle">
                Browse the catalog in one continuous feed. New items load automatically as you approach the bottom, so the page feels like a real storefront instead of a paginated admin list.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-2 tablet:grid-cols-2">
              <div className="rounded-[18px] border border-white/10 bg-white/5 px-4 py-3 backdrop-blur-sm">
                <p className="text-xs uppercase tracking-[0.24em] text-subTitle">Available now</p>
                <p className="mt-2 text-2xl font-semibold text-title">{totalItems}</p>
              </div>
              <div className="rounded-[18px] border border-white/10 bg-white/5 px-4 py-3 backdrop-blur-sm">
                <p className="text-xs uppercase tracking-[0.24em] text-subTitle">Navigation</p>
                <Link
                  href={`/${params.locale}`}
                  className="mt-2 inline-flex rounded-[4px] border border-success/30 px-4 py-2 font-semibold text-success transition-colors duration-300 hover:border-success hover:bg-success hover:text-black">
                  Back to shop
                </Link>
              </div>
            </div>
          </div>
        </section>

        <PopularProductsLazyFeed initialProducts={products} locale={params.locale} totalItems={totalItems} />
      </section>
    </div>
  )
}
