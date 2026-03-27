import { Metadata } from "next"

import supabaseServer from "@/libs/supabase/supabaseServer"
import { normalizeProducts } from "@/utils/productVariants"

import { NoProductsFound } from "./NoProductsFound"
import { Products } from "../components"
import { getI18n } from "@/locales/server"

interface SearchPageProps {
  searchParams: { query: string }
}

export async function generateMetadata({ searchParams: { query } }: SearchPageProps): Promise<Metadata> {
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

export default async function SearchPage({ searchParams: { query } }: SearchPageProps) {
  // https://github.com/nicitaacom/19_spotify-clone/blob/development/actions/getSongsByTitle.ts
  // https://supabase.com/docs/reference/javascript/or
  const products_response = await supabaseServer()
    .from("products")
    .select("*")
    .or(`title.ilike.%${query}%,sub_title.ilike.%${query}%`)
    .order("price", { ascending: true })
  if (products_response.error) throw products_response.error
  const products = normalizeProducts(products_response.data)

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
