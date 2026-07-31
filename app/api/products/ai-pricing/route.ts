import { NextResponse } from "next/server"

import { normalizeAIPriceProposal, normalizeAIPriceSources } from "@/utils/normalizeAIPriceProposal"
import { normalizeProductTranslations } from "@/utils/product"
import { supabaseRouteHandler } from "@/libs/supabase/supabaseRouteHandler"

function isMissingAIPriceSchema(code?: string) {
  return code === "42P01" || code === "42703" || code === "PGRST204" || code === "PGRST205"
}

export async function GET() {
  const supabase = await supabaseRouteHandler()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const [userResp, productsResp, proposalsResp] = await Promise.all([
    supabase.from("23_users").select("ai_pricing_enabled").eq("id", user.id).maybeSingle(),
    supabase
      .from("23_products")
      .select("id, price, translations, ai_pricing_enabled, ai_price_baseline")
      .eq("owner_id", user.id),
    supabase
      .from("23_ai_price_proposals")
      .select("*")
      .eq("owner_id", user.id)
      .order("created_at", { ascending: false })
      .limit(100),
  ])

  const firstError = userResp.error ?? productsResp.error ?? proposalsResp.error
  if (firstError) {
    return NextResponse.json(
      {
        error: isMissingAIPriceSchema(firstError.code)
          ? "Run the AI price proposals SQL block from dev_readme-supbase-sql.md"
          : firstError.message,
      },
      { status: isMissingAIPriceSchema(firstError.code) ? 503 : 500 },
    )
  }

  const runIds = [...new Set((proposalsResp.data ?? []).map(proposal => proposal.run_id))]
  const runsResp = runIds.length
    ? await supabase.from("23_ai_price_runs").select("id, sources").in("id", runIds)
    : { data: [], error: null }

  if (runsResp.error) {
    return NextResponse.json({ error: runsResp.error.message }, { status: 500 })
  }

  const sourcesByRunId = new Map((runsResp.data ?? []).map(run => [run.id, normalizeAIPriceSources(run.sources)]))
  const products = (productsResp.data ?? []).map(product => {
    const translations = normalizeProductTranslations(product.translations)
    return {
      id: product.id,
      name: translations.en.title.trim() || translations.fi.title.trim() || product.id,
      price: product.price,
      enabled: product.ai_pricing_enabled,
      baseline: product.ai_price_baseline,
    }
  })
  const proposals = (proposalsResp.data ?? []).map(proposal =>
    normalizeAIPriceProposal(proposal, sourcesByRunId.get(proposal.run_id) ?? []),
  )

  return NextResponse.json({
    globalEnabled: userResp.data?.ai_pricing_enabled ?? false,
    products,
    proposals,
  } satisfies API.AIPriceSettingsResponse)
}

export async function PATCH(request: Request) {
  const body = (await request.json()) as Partial<API.AIPriceSettingsUpdateRequest>
  const supabase = await supabaseRouteHandler()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  if ("globalEnabled" in body && typeof body.globalEnabled === "boolean") {
    const { error } = await supabase
      .from("23_users")
      .update({ ai_pricing_enabled: body.globalEnabled })
      .eq("id", user.id)

    if (error) {
      return NextResponse.json(
        {
          error: isMissingAIPriceSchema(error.code)
            ? "Run the AI price proposals SQL block from dev_readme-supbase-sql.md"
            : error.message,
        },
        { status: isMissingAIPriceSchema(error.code) ? 503 : 500 },
      )
    }

    return NextResponse.json({ globalEnabled: body.globalEnabled } satisfies API.AIPriceSettingsUpdateResponse)
  }

  if ("productId" in body && "enabled" in body && typeof body.productId === "string" && typeof body.enabled === "boolean") {
    const { data: product, error: selectProductError } = await supabase
      .from("23_products")
      .select("id, owner_id, price, translations, ai_pricing_enabled, ai_price_baseline")
      .eq("id", body.productId)
      .maybeSingle()

    if (selectProductError) return NextResponse.json({ error: selectProductError.message }, { status: 500 })
    if (!product) return NextResponse.json({ error: "Product not found" }, { status: 404 })
    if (product.owner_id !== user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

    const baseline = body.enabled && !product.ai_price_baseline ? product.price : product.ai_price_baseline
    const { error: updateProductError } = await supabase
      .from("23_products")
      .update({
        ai_pricing_enabled: body.enabled,
        ai_price_baseline: baseline,
      })
      .eq("id", product.id)
      .eq("owner_id", user.id)

    if (updateProductError) return NextResponse.json({ error: updateProductError.message }, { status: 500 })

    if (product.ai_pricing_enabled !== body.enabled) {
      const { supabaseAdmin } = await import("@/libs/supabase/supabaseAdmin")
      await supabaseAdmin
        .from("23_ai_price_proposals")
        .update({ status: "expired", reviewed_at: new Date().toISOString() })
        .eq("product_id", product.id)
        .eq("owner_id", user.id)
        .eq("status", "pending")
    }

    const translations = normalizeProductTranslations(product.translations)
    return NextResponse.json({
      product: {
        id: product.id,
        name: translations.en.title.trim() || translations.fi.title.trim() || product.id,
        price: product.price,
        enabled: body.enabled,
        baseline,
      },
    } satisfies API.AIPriceSettingsUpdateResponse)
  }

  return NextResponse.json({ error: "Invalid AI pricing update" }, { status: 400 })
}
