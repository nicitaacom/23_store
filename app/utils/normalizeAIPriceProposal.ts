import { TAIPriceProposal, TAIPriceProposalStatus, TAIPriceSource } from "@/ts/product/TAIPriceProposal"
import { TProductVariant } from "@/ts/product/TProductVariant"

export function normalizeAIPriceSourceUrl(value: unknown) {
  if (typeof value !== "string") return null

  try {
    const url = new URL(value)
    if (url.protocol !== "http:" && url.protocol !== "https:") return null
    return url.toString()
  } catch {
    return null
  }
}

export function normalizeAIPriceSources(value: unknown): TAIPriceSource[] {
  if (!Array.isArray(value)) return []
  return value
    .map(source => {
      if (!source || typeof source !== "object") return null
      const candidate = source as { title?: unknown; url?: unknown }
      const url = normalizeAIPriceSourceUrl(candidate.url)
      if (!url) return null
      return {
        ...(typeof candidate.title === "string" ? { title: candidate.title } : {}),
        url,
      }
    })
    .filter((source): source is TAIPriceSource => Boolean(source))
}

export function normalizeAIPriceProposal(
  proposal: {
    id: string
    run_id: string
    product_id: string
    owner_id: string
    product_name: string
    current_price: number
    baseline_price: number
    proposed_price: number
    proposed_variants: unknown
    reasoning: string
    status: string
    created_at: string
    reviewed_at: string | null
  },
  sources: TAIPriceSource[] = [],
): TAIPriceProposal {
  return {
    ...proposal,
    proposed_variants: Array.isArray(proposal.proposed_variants)
      ? (proposal.proposed_variants as TProductVariant[])
      : null,
    status: proposal.status as TAIPriceProposalStatus,
    sources,
  }
}
