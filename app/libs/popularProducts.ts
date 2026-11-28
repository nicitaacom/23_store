import type { TPopularProduct } from "@/ts/product/TPopularProduct"
import { createPublicCatalogClient } from "@/libs/publicCatalog"
import { normalizeProducts } from "@/utils/productVariants"

export const POPULAR_PRODUCT_COLUMNS = "id,price,img_url,translations,likes_count,rating_sum,rating_count"

export function normalizePopularProducts(rows: TPopularProduct[]) {
  return normalizeProducts(rows)
}

interface FetchPopularProductsOptions {
  page?: number
  perPage?: number
  limit?: number
}

export interface IPopularProductsResult {
  products: TPopularProduct[]
  totalItems: number
  totalPages: number
  page: number
  perPage: number
}

export async function selectPopularProducts({
  page = 1,
  perPage = 24,
  limit,
}: FetchPopularProductsOptions = {}): Promise<IPopularProductsResult> {
  const currentPage = Math.max(1, page)
  const currentPerPage = Math.max(1, perPage)
  const from = limit ? 0 : (currentPage - 1) * currentPerPage
  const to = limit ? Math.max(0, limit - 1) : from + currentPerPage - 1

  const supabase = createPublicCatalogClient()
  // Popular = most likes first (on_stock as a stable tiebreaker) — must match /api/popular-products
  const response = await supabase
    .from("23_products")
    .select(POPULAR_PRODUCT_COLUMNS, { count: "exact" })
    .order("likes_count", { ascending: false, nullsFirst: false })
    .order("on_stock", { ascending: false, nullsFirst: false })
    .range(from, to)

  if (response.error) {
    throw response.error
  }

  const totalItems = response.count ?? response.data.length
  const resolvedPerPage = limit || currentPerPage
  const totalPages = Math.max(1, Math.ceil(totalItems / resolvedPerPage))

  return {
    products: normalizePopularProducts(response.data as unknown as TPopularProduct[]),
    totalItems,
    totalPages,
    page: currentPage,
    perPage: resolvedPerPage,
  }
}
