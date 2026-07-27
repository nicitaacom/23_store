import { NextRequest, NextResponse } from "next/server"

import supabaseAdmin from "@/libs/supabase/supabaseAdmin"

/**
 * POST - record what a buyer personalized, so the owner has the file, the print size and the DPI when
 * the order arrives. Anonymous buyers personalize too, so the row is written with the service role
 * after the product's owner_id is read here instead of trusting the client for it.
 */
export async function POST(req: NextRequest) {
  const body = (await req.json()) as API.PersonalizedDesignsCreateRequest & { user_id: string }

  if (!body.product_id || !body.source_url || !body.user_id) {
    return NextResponse.json({ error: "product_id, source_url and user_id are required" } satisfies API.PersonalizedDesignsCreateResponse, { status: 400 })
  }

  // eslint-disable-next-line local-rules/use-rls-supabase-client -- the buyer may be anonymous, and owner_id must come from the product row, never from the request
  const { data: productRow, error: productError } = await supabaseAdmin
    .from("23_products")
    .select("owner_id")
    .eq("id", body.product_id)
    .limit(1)
    .maybeSingle()

  if (productError || !productRow) {
    return NextResponse.json({ error: "product not found" } satisfies API.PersonalizedDesignsCreateResponse, { status: 404 })
  }

  // eslint-disable-next-line local-rules/use-rls-supabase-client -- same anonymous-buyer boundary as the lookup above
  const { data, error } = await supabaseAdmin
    .from("23_personalized_designs")
    .insert({
      user_id: body.user_id,
      owner_id: productRow.owner_id,
      product_id: body.product_id,
      variant_id: body.variant_id ?? null,
      source_url: body.source_url,
      source_width_px: body.source_width_px,
      source_height_px: body.source_height_px,
      print_width_mm: body.print_width_mm,
      print_height_mm: body.print_height_mm,
      placement: body.placement,
      effective_dpi: body.effective_dpi,
    })
    .select("id")
    .single()

  if (error) {
    return NextResponse.json({ error: error.message } satisfies API.PersonalizedDesignsCreateResponse, { status: 500 })
  }

  return NextResponse.json({ design_id: data.id } satisfies API.PersonalizedDesignsCreateResponse)
}

/** PATCH - the payment went through, so these designs are print jobs now instead of drafts. */
export async function PATCH(req: NextRequest) {
  const body = (await req.json()) as API.PersonalizedDesignsMarkOrderedRequest
  const designIds = body.design_ids?.filter(Boolean) ?? []

  if (!designIds.length) {
    return NextResponse.json({ ordered_amount: 0 } satisfies API.PersonalizedDesignsMarkOrderedResponse)
  }

  // eslint-disable-next-line local-rules/use-rls-supabase-client -- an anonymous buyer owns no session, and the ids come from the cart line that was just paid for
  const { data, error } = await supabaseAdmin
    .from("23_personalized_designs")
    .update({ status: "ordered" })
    .in("id", designIds)
    .select("id")

  if (error) {
    return NextResponse.json({ error: error.message } satisfies API.PersonalizedDesignsMarkOrderedResponse, { status: 500 })
  }

  return NextResponse.json({ ordered_amount: data.length } satisfies API.PersonalizedDesignsMarkOrderedResponse)
}
