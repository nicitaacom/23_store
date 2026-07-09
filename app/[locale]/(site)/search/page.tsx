import { Metadata } from "next"

import { NoProductsFound } from "./NoProductsFound"
import { Products } from "../components"
import { filterProductsBySearchQuery } from "@/utils/productSearch"
import { getI18n } from "@/locales/server"
import { normalizeProducts } from "@/utils/productVariants"
import supabaseServer from "@/libs/supabase/supabaseServer"

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
  const supabase = await supabaseServer()
  const products_response = await supabase.from("23_products").select("*").order("price", { ascending: true })
  if (products_response.error) throw products_response.error
  const products = filterProductsBySearchQuery(normalizeProducts(products_response.data), query)

  if (products.length === 0) {
    return <NoProductsFound />
  }

  return (
    <div className="max-w-[1024px] text-2xl text-white flex flex-col gap-y-8 justify-between items-center py-12 min-h-[calc(100vh-4rem)] mx-auto">
      <section className="flex flex-col gap-y-4">
        <Products products={products} />
      </section>
    </div>
  )
}
