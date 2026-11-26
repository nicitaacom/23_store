import { cache } from "react"
import { after } from "next/server"
import Link from "next/link"
import { BiWindowOpen } from "react-icons/bi"

import { selectCatalogProducts } from "./functions/selectCatalogProducts"
import { AIInputSearch } from "./components/AISearch/AIInputSearch"
import { CatalogAddProductButton } from "./components/CatalogAddProductButton"
import { CatalogSearchForm } from "./components/CatalogSearchForm"
import { CategoryPillBar } from "./components/CategoryPillBar"
import { SortedProducts } from "./components/SortedProducts"
import { CatalogUnavailable } from "./components/CatalogUnavailable/CatalogUnavailable"
import { defaultPerPage, perPage as perPageOptions } from "@/constant/perPage"
import { filterProductsBySearchQuery } from "@/utils/productSearch"
import { getScopedI18n } from "@/locales/server"
import { selectPublicCatalogCategories } from "@/libs/publicCatalog"
import { isSupabaseOutageStatus, reportSupabaseOutage } from "@/libs/storeAlerts"
import { isProductInStock, normalizeProducts } from "@/utils/productVariants"
import supabaseServer from "@/libs/supabase/supabaseServer"
import PaginationControls from "@/components/PaginationControls"
import ProductsPerPage from "@/components/ProductsPerPage"

interface SearchProps {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

const selectProducts = cache(selectCatalogProducts)

export default async function Home({ params: paramsPromise, searchParams: searchParamsPromise }: SearchProps) {
  const params = await paramsPromise
  const searchParams = await searchParamsPromise
  //Fetching all data from DB
  const t = await getScopedI18n("product")
  const supabase = await supabaseServer()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Fetch categories + user category views in parallel
  const viewsPromise = user
    ? supabase.from("23_category_views").select("category_id, view_count").eq("user_id", user.id)
    : Promise.resolve({ data: null })
  const [selectCategoriesResp, viewsResult] = await Promise.all([selectPublicCatalogCategories(), viewsPromise])
  const categories = selectCategoriesResp.data ?? []
  const serverViews: Record<string, number> = {}
  if (viewsResult.data) {
    for (const row of viewsResult.data) serverViews[row.category_id] = row.view_count
  }

  // Resolve category filter
  const categoryParamRaw = searchParams["category"]
  const categoryParam = typeof categoryParamRaw === "string" ? categoryParamRaw : null
  const knownIds = categories.map(category => category.id)
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
    const childIds = categories.filter(category => category.parent_id === validCategory).map(category => category.id)
    categoryIds = [validCategory, ...childIds]
  }

  const selectProductsResp = await selectProducts(categoryIds)
  const databaseError = selectProductsResp.error ?? selectCategoriesResp.error
  const databaseStatus = selectProductsResp.error ? selectProductsResp.status : selectCategoriesResp.status
  if (databaseError)
    console.error("[catalog.database]", { status: databaseStatus, message: databaseError.message, code: databaseError.code })
  if (databaseError && isSupabaseOutageStatus(databaseStatus)) after(() => reportSupabaseOutage(databaseStatus))
  const products = normalizeProducts(selectProductsResp.data ?? []).filter(isProductInStock)
  const filteredProducts = searchQuery ? filterProductsBySearchQuery(products, searchQuery) : products

  //Logic for pagination
  const requestedPerPage = Number(searchParams["perPage"])
  const perPage = perPageOptions.includes(requestedPerPage) ? requestedPerPage : defaultPerPage

  const totalItems = filteredProducts.length
  const totalPages = Math.max(1, Math.ceil(totalItems / perPage))
  const requestedPage = Number(searchParams["page"]) || 1
  const page = Math.min(Math.max(requestedPage, 1), totalPages)

  const start = (page - 1) * perPage
  const end = Math.min(start + perPage, totalItems)

  const entries = filteredProducts.slice(start, end)

  return (
    <div className="mx-auto flex h-[calc(100dvh-64px)] w-full flex-col overflow-hidden px-3 pb-[calc(4.75rem+env(safe-area-inset-bottom))] pt-2 text-2xl text-title laptop:h-[calc(100vh-64px)] laptop:px-4 laptop:pb-2">
      <section className="mx-auto grid min-h-0 w-full flex-1 max-w-[2200px] grid-cols-1 grid-rows-1 gap-1 laptop:grid-cols-[minmax(0,1fr)_minmax(320px,25%)] 4xl:max-w-[3000px]">
        <div className="h-full min-h-0 min-w-0 overflow-y-auto rounded-[4px] border border-success/15 bg-gradient-to-br from-success/5 via-background to-background px-4 py-2 shadow-2xl shadow-success/5 laptop:overflow-hidden">
          <div className="flex min-h-0 flex-col gap-[2px] laptop:h-full">
            <section className="shrink-0 flex flex-col gap-[2px]">
              <div className="flex flex-col gap-2">
                <div className="flex flex-col gap-2 tablet:flex-row tablet:items-center tablet:justify-between">
                  <h1 className="text-xl font-semibold leading-tight tracking-tight text-title laptop:text-2xl">
                    {t("catalog_title")}
                  </h1>
                  <div className="w-full tablet:max-w-[440px]">
                    <CatalogSearchForm
                      ariaLabel={t("catalog_search_action")}
                      focusSearch={searchParams["focusSearch"] === "1"}
                      initialQuery={searchQuery}
                      locale={params.locale}
                      perPage={perPage}
                      placeholder={t("catalog_search_placeholder")}
                      submitLabel={t("catalog_search_action")}
                    />
                  </div>
                </div>
                <div className="flex min-w-0 flex-col gap-2 laptop:flex-row laptop:items-center laptop:justify-between">
                  <div className="min-w-0 flex-1">
                    <CategoryPillBar
                      categories={categories}
                      isAuthenticated={!!user}
                      locale={params.locale}
                      serverViews={serverViews}
                    />
                  </div>
                  <div className="flex shrink-0 flex-row items-center gap-[2px]">
                    <CatalogAddProductButton isAuthenticated={!!user} label={t("add")} />
                    <Link
                      className="inline-flex h-11 w-fit items-center justify-center whitespace-nowrap rounded-[4px] border border-success/30 px-4 py-3 text-sm font-semibold text-success transition-colors duration-150 hover:border-success hover:bg-success hover:text-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-success/70 focus-visible:ring-offset-2 focus-visible:ring-offset-background mobile:text-base max-[480px]:flex-1 max-[480px]:px-0 max-[480px]:py-0"
                      data-cy="catalog-preview-page"
                      href={`/${params.locale}/popular-products`}
                      aria-label={t("open_preview_page")}>
                      <BiWindowOpen className="hidden text-xl max-[480px]:block" />
                      <span className="text-inherit max-[480px]:hidden">{t("open_preview_page")}</span>
                    </Link>
                  </div>
                </div>
              </div>
            </section>

            <section
              className="min-h-0 flex-1 pr-1 laptop:overflow-x-hidden laptop:overflow-y-auto laptop:[scrollbar-gutter:stable]"
              key={`${page}:${perPage}:${validCategory ?? ""}:${searchQuery}`}>
              {databaseError ? (
                <CatalogUnavailable
                  databaseMessage={databaseError.message.trim()}
                  databaseStatus={databaseStatus}
                  autoRecover={[0, 502, 503, 504, 520].includes(databaseStatus)}
                />
              ) : totalItems === 0 ? (
                <div className="flex min-h-full items-center justify-center rounded-[4px] border border-dashed border-success/20 bg-background/60 px-6 py-12 text-center text-base text-subTitle">
                  {t("no_products_found")}
                </div>
              ) : (
                <SortedProducts products={entries} serverViews={serverViews} searchQuery={searchQuery} />
              )}
            </section>

            {!databaseError && (
              <div className="shrink-0 border-t border-success/15 pt-2">
                <div className="flex items-center justify-between gap-2">
                  <PaginationControls
                    hasNextPage={end < totalItems}
                    hasPrevPage={start > 0}
                    currentPage={page}
                    totalPages={totalPages}
                    perPage={perPage}
                    basePath={`/${params.locale}`}
                    categoryId={validCategory}
                    query={searchQuery}
                  />
                  <ProductsPerPage />
                </div>
              </div>
            )}
          </div>
        </div>

        <AIInputSearch />
      </section>
    </div>
  )
}
