import supabaseServer from "@/libs/supabase/supabaseServer"
import { TProductDB } from "@/ts/product/TProductDB"

interface FetchPopularProductsOptions {
  page?: number
  perPage?: number
  limit?: number
}

export interface PopularProductsResult {
  products: TProductDB[]
  totalItems: number
  totalPages: number
  page: number
  perPage: number
}

export async function fetchPopularProducts({
  page = 1,
  perPage = 24,
  limit,
}: FetchPopularProductsOptions = {}): Promise<PopularProductsResult> {
  const currentPage = Math.max(1, page)
  const currentPerPage = Math.max(1, perPage)
  const from = limit ? 0 : (currentPage - 1) * currentPerPage
  const to = limit ? Math.max(0, limit - 1) : from + currentPerPage - 1

  const response = await supabaseServer()
    .from("products")
    .select("*", { count: "exact" })
    .order("on_stock", { ascending: false, nullsFirst: false })
    .order("price", { ascending: true })
    .order("title", { ascending: true })
    .range(from, to)

  if (response.error) {
    throw response.error
  }

  const totalItems = response.count ?? response.data.length
  const resolvedPerPage = limit || currentPerPage
  const totalPages = Math.max(1, Math.ceil(totalItems / resolvedPerPage))

  return {
    products: response.data,
    totalItems,
    totalPages,
    page: currentPage,
    perPage: resolvedPerPage,
  }
}
