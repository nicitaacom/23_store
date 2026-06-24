import { NextResponse } from "next/server"

import supabaseServer from "@/libs/supabase/supabaseServer"
import { normalizeProducts } from "@/utils/productVariants"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const start = Math.max(0, Number(searchParams.get("start")) || 0)
  const endExclusive = Math.max(start + 1, Number(searchParams.get("end")) || start + 24)

  const supabase = await supabaseServer()
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
