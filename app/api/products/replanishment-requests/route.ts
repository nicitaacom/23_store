import { NextRequest, NextResponse } from "next/server"

import { supabaseRouteHandler } from "@/libs/supabase/supabaseRouteHandler"

export async function POST(req: NextRequest) {
  const body = (await req.json()) as API.ProductsReplanishmentRequestsRequest

  if (!body.product_id) {
    return NextResponse.json({ error: "product_id is required" } satisfies API.ProductsReplanishmentRequestsResponse, {
      status: 400,
    })
  }

  const supabase = await supabaseRouteHandler()

  // The SQL function does `count + 1` in one statement, so two buyers clicking at the same moment
  // both land instead of overwriting each other. It lives in dev_readme-supbase-sql.md.
  const { data, error } = await supabase.rpc("increment_product_replanishment_requests", { p_id: body.product_id })

  if (error) {
    return NextResponse.json({ error: error.message } satisfies API.ProductsReplanishmentRequestsResponse, { status: 500 })
  }

  return NextResponse.json({ replanishment_requests_count: Number(data ?? 0) } satisfies API.ProductsReplanishmentRequestsResponse)
}
