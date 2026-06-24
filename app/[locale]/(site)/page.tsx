import { cache } from "react"
import { notFound } from "next/navigation"
import Link from "next/link"
import { BiPlus, BiWindowOpen } from "react-icons/bi"
import { FaPlus } from "react-icons/fa"

import supabaseServer from "@/libs/supabase/supabaseServer"
import { getScopedI18n } from "@/locales/server"
import { perPage as perPageOptions } from "@/constant/perPage"
import { normalizeProducts } from "@/utils/productVariants"
import { filterProductsBySearchQuery } from "@/utils/productSearch"
import PaginationControls from "@/components/PaginationControls"
import ProductsPerPage from "@/components/ProductsPerPage"
import { AIInputSearch } from "./components/AISearch/AIInputSearch"
import { Products } from "./components"
import { CatalogSearchForm } from "./components/CatalogSearchForm"
import { CategoryPillBar } from "./components/CategoryPillBar"
import { TCategory } from "@/ts/categories/TCategory"

interface SearchProps {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

const fetchProducts = cache(async (categoryIds?: string[]) => {
  const supabase = await supabaseServer()
  let query = supabase.from("23_products").select("*").order("price", { ascending: true })
  if (categoryIds && categoryIds.length > 0) {
    query = query.in("category_id", categoryIds)
  }
  const products = await query
  if (!products) notFound()
  return products
})

const fetchCategories = cache(async (): Promise<TCategory[]> => {
  const supabase = await supabaseServer()
  const { data } = await supabase
    .from("23_categories")
    .select("id, name, parent_id")
    .order("parent_id", { ascending: true, nullsFirst: true })
    .order("name", { ascending: true })
  return (data ?? []) as TCategory[]
})

export default async function Home({ params: paramsPromise, searchParams: searchParamsPromise }: SearchProps) {
  const params = await paramsPromise
  const searchParams = await searchParamsPromise
  //Fetching all data from DB
  const t = await getScopedI18n("product")
  const supabase = await supabaseServer()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Fetch categories in parallel with products
  const [categories] = await Promise.all([fetchCategories()])

  // Resolve category filter
  const categoryParamRaw = searchParams["category"]
  const categoryParam = typeof categoryParamRaw === "string" ? categoryParamRaw : null
  const knownIds = categories.map(c => c.id)
  const validCategory = categoryParam && knownIds.includes(categoryParam) ? categoryParam : null

  const searchQueryValue = searchParams["query"]
  const searchQuery =
    typeof searchQueryValue === "string"
      ? searchQueryValue.trim()
      : Array.isArray(searchQueryValue)
        ? (searchQueryValue[0]?.trim() ?? "")
        : ""

  let categoryIds: string[] | undefined
  if (validCategory && !searchQuery) {
    const childIds = categories.filter(c => c.parent_id === validCategory).map(c => c.id)
    categoryIds = [validCategory, ...childIds]
  }

  const products_response = await fetchProducts(categoryIds)
  if (products_response.error) throw products_response.error
  const products = normalizeProducts(products_response.data)
  const filteredProducts = searchQuery ? filterProductsBySearchQuery(products, searchQuery) : products
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
    <div className="mx-auto h-[calc(100vh-64px)] w-full overflow-hidden px-4 pb-[72px] pt-2 text-2xl text-title laptop:pb-2">
      <section className="mx-auto grid h-full w-full max-w-[2200px] grid-cols-1 gap-1 4xl:max-w-[3000px] laptop:grid-cols-[minmax(0,1fr)_minmax(420px,30%)]">
        <div className="min-h-0 min-w-0 overflow-hidden rounded-[4px] border border-success/15 bg-gradient-to-br from-success/5 via-background to-background px-4 py-2 shadow-2xl shadow-success/5">
          <div className="flex h-full min-h-0 flex-col gap-[2px]">
            <section className="shrink-0 flex flex-col gap-[2px]">
              <div className="flex flex-col gap-3">
                <div className="flex w-full flex-row items-start justify-between gap-3">
                  <div className="w-full max-w-[480px] max-[480px]:max-w-none">
                    <CatalogSearchForm
                      ariaLabel={t("catalog_search_action")}
                      initialQuery={searchQuery}
                      locale={params.locale}
                      perPage={perPage}
                      placeholder={t("catalog_search_placeholder")}
                      submitLabel={t("catalog_search_action")}
                    />
                  </div>
                  <div className="flex justify-end max-[480px]:hidden">
                    <div className="inline-flex w-fit items-center rounded-[2px] border border-success/25 bg-success/10 px-3 py-1 text-sm font-medium tracking-wide text-success">
                      {t("products")}
                    </div>
                  </div>
                </div>
                <div className="flex max-w-3xl flex-col gap-2">
                  <h1 className="truncate whitespace-nowrap text-xl font-semibold leading-tight tracking-tight text-title mobile:text-2xl laptop:text-4xl">
                    {t("catalog_title")}
                  </h1>
                  <p className="hidden max-w-3xl text-base leading-7 text-subTitle tablet:block">{t("catalog_subtitle")}</p>
                  <CategoryPillBar
                    categories={categories}
                    isAuthenticated={!!user}
                    locale={params.locale}
                  />
                  <div className="flex flex-row items-center gap-[2px] pt-1">
                    <Link
                      href={addProductHref}
                      aria-label={t("add")}
                      className="inline-flex h-10 w-fit items-center justify-center gap-2 whitespace-nowrap rounded-[4px] border border-success/30 px-4 py-3 text-sm font-semibold text-success transition-colors duration-300 hover:border-success hover:bg-success hover:text-black mobile:text-base max-[480px]:flex-1 max-[480px]:gap-0 max-[480px]:px-0 max-[480px]:py-0">
                      <BiPlus className="hidden text-xl max-[480px]:block" />
                      <FaPlus className="hidden text-sm min-[481px]:block" />
                      <span className="max-[480px]:hidden">{t("add")}</span>
                    </Link>
                    <Link
                      href={`/${params.locale}/popular-products`}
                      aria-label={t("open_preview_page")}
                      className="inline-flex h-10 w-fit items-center justify-center whitespace-nowrap rounded-[4px] border border-success/30 px-4 py-3 text-sm font-semibold text-success transition-colors duration-300 hover:border-success hover:bg-success hover:text-black mobile:text-base max-[480px]:flex-1 max-[480px]:px-0 max-[480px]:py-0">
                      <BiWindowOpen className="hidden text-xl max-[480px]:block" />
                      <span className="max-[480px]:hidden">{t("open_preview_page")}</span>
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

        <AIInputSearch />
      </section>
    </div>
  )
}
