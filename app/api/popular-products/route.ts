import { NextResponse } from "next/server"

import { createPublicCatalogClient } from "@/libs/publicCatalog"
import { normalizeProducts } from "@/utils/productVariants"

const MAX_PRODUCTS_PER_REQUEST = 100

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const start = Number(searchParams.get("start") ?? 0)
  const endExclusive = Number(searchParams.get("end") ?? start + 24)
  if (!Number.isSafeInteger(start) || start < 0 || !Number.isSafeInteger(endExclusive)
    || endExclusive <= start || endExclusive - start > MAX_PRODUCTS_PER_REQUEST) {
    return NextResponse.json({ error: "The requested product range is invalid." }, { status: 400 })
  }

  const supabase = createPublicCatalogClient()
  // Popular = most likes first. on_stock is a stable tiebreaker so paging stays deterministic.
  const response = await supabase
    .from("23_products")
    .select("*")
    .order("likes_count", { ascending: false, nullsFirst: false })
    .order("on_stock", { ascending: false, nullsFirst: false })
    .range(start, endExclusive - 1)

  if (response.error) {
    return NextResponse.json({ error: response.error.message }, { status: 500 })
  }

  return NextResponse.json({
    products: normalizeProducts(response.data ?? []),
  })
}
