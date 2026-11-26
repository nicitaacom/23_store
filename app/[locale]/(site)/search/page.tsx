import { Metadata } from "next"

import { NoProductsFound } from "./NoProductsFound"
import { Products } from "../components"
import { selectCatalogProducts } from "../functions/selectCatalogProducts"
import { SearchTracker } from "./SearchTracker"
import { filterProductsBySearchQuery } from "@/utils/productSearch"
import { getI18n } from "@/locales/server"
import { isProductInStock, normalizeProducts } from "@/utils/productVariants"

interface SearchPageProps {
  searchParams: Promise<{ query: string }>
}

export async function generateMetadata({ searchParams: searchParamsPromise }: SearchPageProps): Promise<Metadata> {
  const { query } = await searchParamsPromise
  const t = await getI18n()

  if (query === undefined) {
    return {
      title: `${t("search.title")} - Joki`,
    }
  }

  return {
    title: `${t("search.title")} ${query} - Joki`,
  }
}

export default async function SearchPage({ searchParams: searchParamsPromise }: SearchPageProps) {
  const { query } = await searchParamsPromise
  const selectCatalogProductsResp = await selectCatalogProducts()
  if (selectCatalogProductsResp.error) throw selectCatalogProductsResp.error
  const products = filterProductsBySearchQuery(normalizeProducts(selectCatalogProductsResp.data).filter(isProductInStock), query)

  if (products.length === 0) {
    return (
      <>
        <SearchTracker query={query} resultsCount={products.length} />
        <NoProductsFound />
      </>
    )
  }

  return (
    <div className="mx-auto flex min-h-[calc(100dvh-4rem)] max-w-[1024px] flex-col items-center justify-between gap-y-8 py-12 text-2xl text-white max-[767px]:gap-y-3 max-[767px]:px-0 max-[767px]:py-2">
      <SearchTracker query={query} resultsCount={products.length} />
      <section className="flex flex-col gap-y-4 max-[767px]:gap-y-2">
        <Products products={products} />
      </section>
    </div>
  )
}
