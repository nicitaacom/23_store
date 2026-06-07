import { NextResponse } from "next/server"

import supabaseServer from "@/libs/supabase/supabaseServer"
import { sortProductsByLocale } from "@/utils/product"
import { normalizeProducts } from "@/utils/productVariants"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const start = Math.max(0, Number(searchParams.get("start")) || 0)
  const endExclusive = Math.max(start + 1, Number(searchParams.get("end")) || start + 24)

  const supabase = await supabaseServer()
  const response = await supabase
    .from("23_products")
    .select("*")
    .order("on_stock", { ascending: false, nullsFirst: false })
    .order("price", { ascending: true })
    .range(start, endExclusive - 1)

  if (response.error) {
    return NextResponse.json({ error: response.error.message }, { status: 500 })
  }

  return NextResponse.json({
    products: sortProductsByLocale(normalizeProducts(response.data ?? []), "fi"),
  })
}
