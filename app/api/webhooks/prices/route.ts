import { NextResponse } from "next/server"
import { timingSafeEqual } from "node:crypto"
import type { Response } from "openai/resources/responses/responses"

import {
  adjustVariantPrices,
  clampAIPrice,
  getUTCWeekKey,
  TAIPriceResearchInput,
  validateAIPriceResearch,
} from "@/utils/aiPricing"
import { normalizeAIPriceSourceUrl } from "@/utils/normalizeAIPriceProposal"
import { normalizeProduct } from "@/utils/productVariants"
import { AI_PRICE_MAX_REASONING_LENGTH, AI_PRICING_MODEL } from "@/constants/aiPricing"
import { Json } from "@/ts/types_db"

export const maxDuration = 60

function authorizeWebhook(request: Request) {
  const secret = process.env.PRICE_WEBHOOK_SECRET
  if (!secret) return { error: "PRICE_WEBHOOK_SECRET is not configured", status: 503 }

  const authorization = request.headers.get("authorization")
  const receivedSecret = authorization?.startsWith("Bearer ") ? authorization.slice(7) : ""
  const expectedBuffer = Buffer.from(secret)
  const receivedBuffer = Buffer.from(receivedSecret)

  if (expectedBuffer.length !== receivedBuffer.length || !timingSafeEqual(expectedBuffer, receivedBuffer)) {
    return { error: "Unauthorized", status: 401 }
  }

  return null
}

function collectSources(response: Response) {
  const sourceByUrl = new Map<string, { title?: string; url: string }>()

  function addSource(urlValue: unknown, title?: string) {
    const url = normalizeAIPriceSourceUrl(urlValue)
    if (!url) return
    sourceByUrl.set(url, { ...(title ? { title } : {}), url })
  }

  for (const item of response.output) {
    if (item.type === "web_search_call") {
      if (item.action.type === "search") {
        for (const source of item.action.sources ?? []) addSource(source.url)
      } else if (item.action.url) {
        addSource(item.action.url)
      }
    }

    if (item.type === "message") {
      for (const content of item.content) {
        if (content.type !== "output_text") continue
        for (const annotation of content.annotations) {
          if (annotation.type === "url_citation") {
            addSource(annotation.url, annotation.title)
          }
        }
      }
    }
  }

  return [...sourceByUrl.values()]
}

function explainClampedPrice(researchedPrice: number, proposedPrice: number, reasoning: string) {
  if (researchedPrice === proposedPrice) return reasoning

  const direction = researchedPrice > proposedPrice ? "+12.5% maximum" : "-12.5% minimum"
  return `Limited to the permanent ${direction} from the owner-set baseline. ${reasoning}`
    .slice(0, AI_PRICE_MAX_REASONING_LENGTH)
    .trim()
}

export async function POST(request: Request) {
  const authorizationError = authorizeWebhook(request)
  if (authorizationError) {
    return NextResponse.json({ error: authorizationError.error }, { status: authorizationError.status })
  }

  const [{ supabaseAdmin }, { openai }] = await Promise.all([
    import("@/libs/supabase/supabaseAdmin"),
    import("@/libs/openai"),
  ])
  const weekKey = getUTCWeekKey()
  const { data: insertedRun, error: insertRunError } = await supabaseAdmin
    .from("23_ai_price_runs")
    .insert({ week_key: weekKey, status: "running", model: AI_PRICING_MODEL })
    .select("*")
    .single()

  if (insertRunError?.code === "23505") {
    const { data: existingRun } = await supabaseAdmin
      .from("23_ai_price_runs")
      .select("id, status, proposal_count")
      .eq("week_key", weekKey)
      .maybeSingle()

    return NextResponse.json({
      duplicate: true,
      runId: existingRun?.id ?? null,
      status: existingRun?.status ?? "running",
      proposalCount: existingRun?.proposal_count ?? 0,
    })
  }

  if (insertRunError || !insertedRun) {
    return NextResponse.json(
      { error: insertRunError?.message ?? "Could not start AI price run" },
      { status: insertRunError?.code === "42P01" || insertRunError?.code === "42703" ? 503 : 500 },
    )
  }

  try {
    const { data: enabledProducts, error: selectProductsError } = await supabaseAdmin
      .from("23_products")
      .select(
        "id, owner_id, price, translations, variants, on_stock, img_url, price_id, personalization, ai_pricing_enabled, ai_price_baseline",
      )
      .eq("ai_pricing_enabled", true)

    if (selectProductsError) throw selectProductsError

    const ownerIds = [...new Set((enabledProducts ?? []).map(product => product.owner_id))]
    const { data: enabledOwners, error: selectOwnersError } = ownerIds.length
      ? await supabaseAdmin.from("23_users").select("id").in("id", ownerIds).eq("ai_pricing_enabled", true)
      : { data: [], error: null }

    if (selectOwnersError) throw selectOwnersError

    const enabledOwnerIds = new Set((enabledOwners ?? []).map(owner => owner.id))
    const eligibleProducts = (enabledProducts ?? [])
      .filter(product => enabledOwnerIds.has(product.owner_id) && Number(product.ai_price_baseline) > 0 && product.price > 0)
      .map(product => normalizeProduct(product))

    if (!eligibleProducts.length) {
      await supabaseAdmin
        .from("23_ai_price_runs")
        .update({
          status: "skipped",
          eligible_count: 0,
          proposal_count: 0,
          completed_at: new Date().toISOString(),
        })
        .eq("id", insertedRun.id)

      return NextResponse.json({ runId: insertedRun.id, status: "skipped", proposalCount: 0 })
    }

    const researchInputs: TAIPriceResearchInput[] = eligibleProducts.map(product => ({
      id: product.id,
      name: product.translations.en.title.trim() || product.translations.fi.title.trim() || product.id,
      price: product.price,
    }))

    const response = await openai.responses.create({
      model: AI_PRICING_MODEL,
      reasoning: { effort: "low" },
      tools: [{ type: "web_search", search_context_size: "medium" }],
      tool_choice: "required",
      include: ["web_search_call.action.sources"],
      // eslint-disable-next-line local-rules/no-banned-words -- OpenAI Responses API property name
      instructions: [
        "You are preparing weekly product-price proposals for a store owner.",
        "Research trustworthy reporting from the previous seven days about China trade, manufacturing, logistics, supply chains, and macroeconomic conditions, plus current USD/JPY movement.",
        "Use those real-world conditions only when they plausibly affect each named product. Do not invent product facts.",
        "Return every input product exactly once with the exact same id and name.",
        "The price may increase, decrease, or remain unchanged. Avoid mechanical repeated increases.",
        `Explain the recommendation in plain language in 1–${AI_PRICE_MAX_REASONING_LENGTH} characters.`,
      ].join(" "),
      input: JSON.stringify({ products: researchInputs }),
      text: {
        format: {
          type: "json_schema",
          name: "weekly_price_research",
          strict: true,
          schema: {
            type: "object",
            additionalProperties: false,
            required: ["products"],
            properties: {
              products: {
                type: "array",
                minItems: researchInputs.length,
                maxItems: researchInputs.length,
                items: {
                  type: "object",
                  additionalProperties: false,
                  required: ["id", "name", "price", "reasoning"],
                  properties: {
                    id: { type: "string" },
                    name: { type: "string" },
                    price: { type: "number", exclusiveMinimum: 0 },
                    reasoning: { type: "string", minLength: 1, maxLength: AI_PRICE_MAX_REASONING_LENGTH },
                  },
                },
              },
            },
          },
        },
      },
    })

    const researchedProducts = validateAIPriceResearch(JSON.parse(response.output_text), researchInputs)
    const researchedById = new Map(researchedProducts.map(product => [product.id, product]))
    const sources = collectSources(response)
    const proposals = eligibleProducts.map(product => {
      const research = researchedById.get(product.id)
      if (!research) throw new Error(`Missing researched product ${product.id}`)

      const baselinePrice = Number(product.ai_price_baseline)
      const proposedPrice = clampAIPrice(research.price, baselinePrice)
      const proposedVariants = adjustVariantPrices(product.variants, product.price, proposedPrice)

      return {
        run_id: insertedRun.id,
        product_id: product.id,
        owner_id: product.owner_id,
        product_name: research.name,
        current_price: product.price,
        baseline_price: baselinePrice,
        proposed_price: proposedPrice,
        proposed_variants: proposedVariants as unknown as Json,
        reasoning: explainClampedPrice(research.price, proposedPrice, research.reasoning),
      }
    })

    const { error: insertProposalsError } = await supabaseAdmin.from("23_ai_price_proposals").insert(proposals)
    if (insertProposalsError) throw insertProposalsError

    const productIds = eligibleProducts.map(product => product.id)
    const { error: expireProposalsError } = await supabaseAdmin
      .from("23_ai_price_proposals")
      .update({ status: "expired", reviewed_at: new Date().toISOString() })
      .in("product_id", productIds)
      .eq("status", "pending")
      .neq("run_id", insertedRun.id)

    if (expireProposalsError) throw expireProposalsError

    const { error: completeRunError } = await supabaseAdmin
      .from("23_ai_price_runs")
      .update({
        status: "completed",
        eligible_count: eligibleProducts.length,
        proposal_count: proposals.length,
        openai_response_id: response.id,
        sources: sources as Json,
        completed_at: new Date().toISOString(),
      })
      .eq("id", insertedRun.id)

    if (completeRunError) throw completeRunError

    return NextResponse.json({
      runId: insertedRun.id,
      status: "completed",
      proposalCount: proposals.length,
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    await supabaseAdmin.from("23_ai_price_proposals").delete().eq("run_id", insertedRun.id)
    await supabaseAdmin
      .from("23_ai_price_runs")
      .update({
        status: "failed",
        error: errorMessage.slice(0, 2000),
        completed_at: new Date().toISOString(),
      })
      .eq("id", insertedRun.id)

    console.error("[webhooks/prices] weekly AI price run failed", { runId: insertedRun.id, error: errorMessage })
    return NextResponse.json({ error: "Weekly AI price research failed", runId: insertedRun.id }, { status: 500 })
  }
}
