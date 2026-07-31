import { NextResponse } from "next/server"
import Stripe from "stripe"

import { getAIPriceBand, roundPrice } from "@/utils/aiPricing"
import { normalizeAIPriceProposal } from "@/utils/normalizeAIPriceProposal"
import { normalizeProduct } from "@/utils/productVariants"
import { stripe } from "@/libs/stripe"
import { supabaseRouteHandler } from "@/libs/supabase/supabaseRouteHandler"

interface RouteContext {
  params: Promise<{ proposalId: string }>
}

export async function POST(_request: Request, { params }: RouteContext) {
  const { proposalId } = await params
  const supabase = await supabaseRouteHandler()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { data: proposal, error: selectProposalError } = await supabase
    .from("23_ai_price_proposals")
    .select("*")
    .eq("id", proposalId)
    .maybeSingle()

  if (selectProposalError) return NextResponse.json({ error: selectProposalError.message }, { status: 500 })
  if (!proposal) return NextResponse.json({ error: "Price proposal not found" }, { status: 404 })
  if (proposal.owner_id !== user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  if (proposal.status !== "pending") {
    return NextResponse.json({ error: "Price proposal is no longer pending" }, { status: 409 })
  }

  const { data: product, error: selectProductError } = await supabase
    .from("23_products")
    .select("*")
    .eq("id", proposal.product_id)
    .maybeSingle()

  if (selectProductError) return NextResponse.json({ error: selectProductError.message }, { status: 500 })
  if (!product || product.owner_id !== user.id) return NextResponse.json({ error: "Product not found" }, { status: 404 })
  if (product.price !== proposal.current_price || product.ai_price_baseline !== proposal.baseline_price) {
    return NextResponse.json({ error: "Product price changed after this proposal was created" }, { status: 409 })
  }

  const band = getAIPriceBand(proposal.baseline_price)
  if (proposal.proposed_price < band.minimum || proposal.proposed_price > band.maximum) {
    return NextResponse.json({ error: "Proposed price is outside the baseline band" }, { status: 409 })
  }

  const isPriceUnchanged = roundPrice(proposal.proposed_price) === roundPrice(product.price)
  let newPriceId = product.price_id
  let createdPriceId: string | null = null
  let changedStripeDefault = false
  let databaseCommitted = false

  try {
    if (!isPriceUnchanged) {
      const priceResponse = await stripe.prices.create({
        product: product.id,
        unit_amount: Math.round(proposal.proposed_price * 100),
        currency: "usd",
        metadata: { ai_price_proposal_id: proposal.id },
      })
      newPriceId = priceResponse.id
      createdPriceId = priceResponse.id

      await stripe.products.update(product.id, { default_price: priceResponse.id })
      changedStripeDefault = true
    }

    const { error: approveProposalError } = await supabase.rpc("approve_ai_price_proposal", {
      p_proposal_id: proposal.id,
      p_new_price_id: newPriceId,
    })

    if (approveProposalError) throw approveProposalError
    databaseCommitted = true

    const [updatedProductResp, approvedProposalResp] = await Promise.all([
      supabase.from("23_products").select("*").eq("id", product.id).single(),
      supabase.from("23_ai_price_proposals").select("*").eq("id", proposal.id).single(),
    ])

    if (createdPriceId && product.price_id !== createdPriceId) {
      try {
        await stripe.prices.update(product.price_id, { active: false })
      } catch (error) {
        console.error("[price-proposals/approve] old Stripe price stayed active", {
          priceId: product.price_id,
          error: error instanceof Error ? error.message : String(error),
        })
      }
    }

    const reviewedAt = new Date().toISOString()
    return NextResponse.json({
      proposal: normalizeAIPriceProposal(
        approvedProposalResp.data ?? {
          ...proposal,
          status: "approved",
          reviewed_at: reviewedAt,
        },
      ),
      product: normalizeProduct(
        updatedProductResp.data ?? {
          ...product,
          price: proposal.proposed_price,
          price_id: newPriceId,
          variants: proposal.proposed_variants,
        },
      ),
    } satisfies API.AIPriceProposalReviewResponse)
  } catch (error) {
    if (createdPriceId && !databaseCommitted) {
      const { data: latestProduct } = await supabase
        .from("23_products")
        .select("price_id")
        .eq("id", product.id)
        .maybeSingle()

      // A timed-out RPC may have committed even though the client received an error. It is also
      // possible that a competing approval committed first. Reconcile to the database instead of
      // restoring the stale price id read at the start of this request.
      if (latestProduct?.price_id === createdPriceId) {
        databaseCommitted = true
      } else {
        if (changedStripeDefault) {
          try {
            await stripe.products.update(product.id, { default_price: latestProduct?.price_id ?? product.price_id })
          } catch (rollbackError) {
            console.error("[price-proposals/approve] could not restore Stripe default price", {
              productId: product.id,
              error: rollbackError instanceof Error ? rollbackError.message : String(rollbackError),
            })
          }
        }
        try {
          await stripe.prices.update(createdPriceId, { active: false })
        } catch {}
      }
    }

    if (error instanceof Stripe.errors.StripeError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode ?? 500 })
    }
    const errorMessage = error instanceof Error ? error.message : String(error)
    const status = /no longer pending|changed after|outside the baseline|Forbidden/.test(errorMessage) ? 409 : 500
    return NextResponse.json({ error: errorMessage }, { status })
  }
}
