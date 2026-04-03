import { cache } from "react"
import { notFound } from "next/navigation"
import Link from "next/link"

import supabaseServer from "@/libs/supabase/supabaseServer"
import { getScopedI18n } from "@/locales/server"
import { perPage as perPageOptions } from "@/constant/perPage"
import { normalizeProducts } from "@/utils/productVariants"
import PaginationControls from "@/components/PaginationControls"
import ProductsPerPage from "@/components/ProductsPerPage"
import { AIInputSearch } from "./components/AISearch/AIInputSearch"
import { Products } from "./components"

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
  const t = await getScopedI18n("product")
  const {
    data: { user },
  } = await supabaseServer().auth.getUser()
  const products_response = await fetchProducts()
  if (products_response.error) throw products_response.error
  const products = normalizeProducts(products_response.data)
  const searchQueryValue = searchParams["query"]
  const searchQuery =
    typeof searchQueryValue === "string"
      ? searchQueryValue.trim()
      : Array.isArray(searchQueryValue)
        ? (searchQueryValue[0]?.trim() ?? "")
        : ""
  const normalizedSearchQuery = searchQuery.toLowerCase()
  const filteredProducts =
    normalizedSearchQuery.length > 0
      ? products.filter(product =>
          [product.title, product.sub_title].some(value => value.toLowerCase().includes(normalizedSearchQuery)),
        )
      : products
  const addProductHref = user ? `/${params.locale}?modal=AdminPanel` : `/${params.locale}?modal=AuthModal&variant=login`

  //Logic for pagination
  const requestedPerPage = Number(searchParams["perPage"])
  const perPage = perPageOptions.includes(requestedPerPage) ? requestedPerPage : perPageOptions[0]

  const totalItems = filteredProducts.length
  const totalPages = Math.max(1, Math.ceil(totalItems / perPage))
  const requestedPage = Number(searchParams["page"]) || 1
  const page = Math.min(Math.max(requestedPage, 1), totalPages)

  const start = (page - 1) * perPage
  const end = Math.min(start + perPage, totalItems)

  const entries = filteredProducts.slice(start, end)

  return (
    <div className="mx-auto h-[calc(100vh-64px)] w-full overflow-hidden px-4 py-2 text-2xl text-title">
      <section className="mx-auto grid h-full w-full max-w-[2200px] grid-cols-1 gap-1 4xl:max-w-[3000px] laptop:grid-cols-[minmax(0,1fr)_minmax(420px,30%)]">
        <div className="min-h-0 min-w-0 overflow-hidden rounded-[4px] border border-success/15 bg-gradient-to-br from-success/5 via-background to-background px-4 py-2 shadow-2xl shadow-success/5">
          <div className="flex h-full min-h-0 flex-col gap-[2px]">
            <section className="shrink-0 flex flex-col gap-[2px]">
              <div className="flex flex-col gap-3">
                <div className="flex w-full flex-row items-start justify-between gap-3">
                  <div className="w-full max-w-[480px] max-[480px]:max-w-none">
                    <form
                      action={`/${params.locale}`}
                      className="flex w-full items-center justify-between gap-2 rounded-[2px] border border-success/15 bg-gradient-to-r from-background via-background/95 to-success/5 p-1 shadow-[0_18px_45px_rgba(34,197,94,0.08)] backdrop-blur-sm"
                      method="get">
                      <input type="hidden" name="page" value="1" />
                      <input type="hidden" name="perPage" value={perPage} />
                      <input
                        aria-label={t("catalog_search_action")}
                        className="h-10 w-full rounded-[2px] bg-transparent px-3 text-base text-title outline-none placeholder:text-subTitle"
                        defaultValue={searchQuery}
                        name="query"
                        placeholder={t("catalog_search_placeholder")}
                        type="search"
                      />
                      <button
                        className="inline-flex h-10 shrink-0 items-center justify-center rounded-[2px] border border-success/30 bg-success/10 px-4 text-sm font-semibold text-success transition-all duration-300 hover:border-success hover:bg-success hover:text-black"
                        type="submit">
                        {t("catalog_search_action")}
                      </button>
                    </form>
                  </div>
                  <div className="flex justify-end max-[480px]:hidden">
                    <div className="inline-flex w-fit items-center rounded-[2px] border border-success/25 bg-success/10 px-3 py-1 text-sm font-medium tracking-wide text-success">
                      {t("products")}
                    </div>
                  </div>
                </div>
                <div className="flex max-w-3xl flex-col gap-3">
                  <h1 className="text-3xl font-semibold leading-tight tracking-tight text-title laptop:text-4xl">
                    {t("catalog_title")}
                  </h1>
                  <p className="max-w-3xl text-base leading-7 text-subTitle">{t("catalog_subtitle")}</p>
                  <div className="flex flex-wrap items-center gap-[2px] pt-1">
                    <Link
                      href={addProductHref}
                      className="inline-flex w-fit items-center justify-center rounded-[4px] border border-success/30 px-5 py-3 text-base font-semibold text-success transition-colors duration-300 hover:border-success hover:bg-success hover:text-black">
                      {t("add")}
                    </Link>
                    <Link
                      href={`/${params.locale}/popular-products`}
                      className="inline-flex w-fit items-center justify-center rounded-[4px] border border-success/30 px-5 py-3 text-base font-semibold text-success transition-colors duration-300 hover:border-success hover:bg-success hover:text-black">
                      {t("open_preview_page")}
                    </Link>
                  </div>
                </div>
              </div>
            </section>

            <section className="panel-scroll min-h-0 flex-1 overflow-x-hidden overflow-y-auto pr-1">
              {totalItems === 0 ? (
                <div className="flex min-h-full items-center justify-center rounded-[4px] border border-dashed border-success/20 bg-background/60 px-6 py-12 text-center text-base text-subTitle">
                  {t("no_products_found")}
                </div>
              ) : (
                <Products products={entries} />
              )}
            </section>

            <div className="shrink-0 border-t border-success/15 pt-2">
              <div className="flex flex-col-reverse items-center justify-between gap-[2px] tablet:flex-row">
                <PaginationControls
                  hasNextPage={end < totalItems}
                  hasPrevPage={start > 0}
                  currentPage={page}
                  totalPages={totalPages}
                  perPage={perPage}
                  basePath={`/${params.locale}`}
                  query={searchQuery}
                />
                <ProductsPerPage />
              </div>
            </div>
          </div>
        </div>

        <aside className="panel-scroll min-h-0 overflow-x-hidden overflow-y-auto rounded-[4px] border border-border-color/20 bg-background/90 px-4 py-2 shadow-2xl shadow-black/10">
          <AIInputSearch />
        </aside>
      </section>
    </div>
  )
}
