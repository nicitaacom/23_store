import { NextResponse } from "next/server"

import { normalizeAIPriceProposal } from "@/utils/normalizeAIPriceProposal"
import { supabaseAdmin } from "@/libs/supabase/supabaseAdmin"
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

  const reviewedAt = new Date().toISOString()
  // eslint-disable-next-line local-rules/use-rls-supabase-client -- caller ownership was verified above; proposal status is server-controlled
  const { data: rejectedProposal, error: rejectProposalError } = await supabaseAdmin
    .from("23_ai_price_proposals")
    .update({ status: "rejected", reviewed_at: reviewedAt })
    .eq("id", proposal.id)
    .eq("owner_id", user.id)
    .eq("status", "pending")
    .select("*")
    .maybeSingle()

  if (rejectProposalError) return NextResponse.json({ error: rejectProposalError.message }, { status: 500 })
  if (!rejectedProposal) return NextResponse.json({ error: "Price proposal is no longer pending" }, { status: 409 })

  return NextResponse.json({
    proposal: normalizeAIPriceProposal(rejectedProposal),
  } satisfies API.AIPriceProposalReviewResponse)
}
