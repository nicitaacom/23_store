import { TProductVariant } from "./TProductVariant"

export type TAIPriceProposalStatus = "pending" | "approved" | "rejected" | "expired"

export type TAIPriceSource = {
  title?: string
  url: string
}

export type TAIPriceProposal = {
  id: string
  run_id: string
  product_id: string
  owner_id: string
  product_name: string
  current_price: number
  baseline_price: number
  proposed_price: number
  proposed_variants: TProductVariant[] | null
  reasoning: string
  status: TAIPriceProposalStatus
  created_at: string
  reviewed_at: string | null
  sources: TAIPriceSource[]
}
