import { cache, lazy } from "react"
import { notFound } from "next/navigation"
import Link from "next/link"

import supabaseServer from "@/libs/supabase/supabaseServer"
import { fetchPopularProducts } from "@/libs/popularProducts"
import PaginationControls from "@/components/PaginationControls"
import { AIInputSearch } from "./components/AISearch/AIInputSearch"
import { PopularProductsPreviewList } from "./components/PopularProductsPreviewList"

interface SearchProps {
  params: { locale: string }
  searchParams: { [key: string]: string | string[] | undefined }
}

const fetchProducts = cache(async () => {
  const products = await supabaseServer().from("products").select("*").order("price", { ascending: true })
  if (!products) notFound()
  return products
})

export default async function Home({ params, searchParams }: SearchProps) {
  //Fetching all data from DB
  const {
    data: { user },
  } = await supabaseServer().auth.getUser()
  const products_response = await fetchProducts()
  if (products_response.error) throw products_response.error
  const products = products_response.data
  const popularProductsResponse = await fetchPopularProducts({ limit: 6 })
  const addProductHref = user ? `/${params.locale}?modal=AdminPanel` : `/${params.locale}?modal=AuthModal&variant=login`

  //Logic for pagination
  const page = Number(searchParams["page"]) || 1
  const perPage = Number(searchParams["perPage"]) || 5

  const totalItems = products.length
  const totalPages = Math.ceil(totalItems / perPage)

  const start = (page - 1) * perPage
  const end = Math.min(start + perPage, totalItems)

  const entries = products.slice(start, end)
  const ProductsPerPage = lazy(() => import("@/components/ProductsPerPage"))

  return (
    <div
      className="mx-auto h-[calc(100vh-64px)] w-full overflow-hidden px-4 py-2 text-2xl text-title">
      <section className="mx-auto grid h-full w-full max-w-[2200px] grid-cols-1 gap-1 4xl:max-w-[3000px] laptop:grid-cols-[minmax(0,1fr)_minmax(420px,30%)]">
        <div className="panel-scroll min-h-0 overflow-x-hidden overflow-y-auto rounded-[4px] border border-success/15 bg-gradient-to-br from-success/5 via-background to-background px-4 py-2 shadow-2xl shadow-success/5">
          <section className="mb-[2px] flex flex-col gap-[2px]">
            <div className="flex flex-col gap-[2px] laptop:flex-row laptop:items-end laptop:justify-between">
              <div className="flex max-w-3xl flex-col gap-[2px]">
                <div className="inline-flex w-fit items-center rounded-[4px] border border-success/30 bg-success/10 px-3 py-1 text-sm font-medium text-success">
                  Popular products
                </div>
                <h1 className="text-3xl font-semibold tracking-tight text-title laptop:text-4xl">Preview the products customers click first</h1>
                <p className="text-base leading-7 text-subTitle">
                  Featured products stay front and center while the assistant remains available in a dedicated side panel.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-[2px]">
                <Link
                  href={addProductHref}
                  className="inline-flex w-fit items-center justify-center rounded-[4px] border border-success/30 px-5 py-3 text-base font-semibold text-success transition-colors duration-300 hover:border-success hover:bg-success hover:text-black">
                  Add product
                </Link>
                <Link
                  href={`/${params.locale}/popular-products`}
                  className="inline-flex w-fit items-center justify-center rounded-[4px] border border-success/30 px-5 py-3 text-base font-semibold text-success transition-colors duration-300 hover:border-success hover:bg-success hover:text-black">
                  Open preview page
                </Link>
              </div>
            </div>
          </section>

          <PopularProductsPreviewList
            products={popularProductsResponse.products}
            locale={params.locale}
            showHeader={false}
            compact
          />

          <div className="mt-[2px] flex flex-col-reverse items-center justify-between gap-[2px] tablet:flex-row">
            <PaginationControls
              hasNextPage={end < totalItems}
              hasPrevPage={start > 0}
              currentPage={page}
              totalPages={totalPages}
              perPage={perPage}
            />
            <ProductsPerPage />
          </div>
        </div>

        <aside className="panel-scroll min-h-0 overflow-x-hidden overflow-y-auto rounded-[4px] border border-border-color/20 bg-background/90 px-4 py-2 shadow-2xl shadow-black/10">
          <AIInputSearch />
        </aside>
      </section>
    </div>
  )
}
