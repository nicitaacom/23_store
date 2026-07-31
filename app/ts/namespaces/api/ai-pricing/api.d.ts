// DO NOT import anything here

declare namespace API {
  type AIPriceSource = {
    title?: string
    url: string
  }

  type AIPriceProposal = {
    id: string
    run_id: string
    product_id: string
    owner_id: string
    product_name: string
    current_price: number
    baseline_price: number
    proposed_price: number
    proposed_variants: ProductsVariant[] | null
    reasoning: string
    status: "pending" | "approved" | "rejected" | "expired"
    created_at: string
    reviewed_at: string | null
    sources: AIPriceSource[]
  }

  type AIPriceProductSetting = {
    id: string
    name: string
    price: number
    enabled: boolean
    baseline: number | null
  }

  type AIPriceSettingsResponse = {
    globalEnabled: boolean
    products: AIPriceProductSetting[]
    proposals: AIPriceProposal[]
  }

  type AIPriceSettingsUpdateRequest =
    | { globalEnabled: boolean }
    | {
        productId: string
        enabled: boolean
      }

  type AIPriceSettingsUpdateResponse = {
    globalEnabled?: boolean
    product?: AIPriceProductSetting
  }

  type AIPriceProposalReviewResponse = {
    proposal: AIPriceProposal
    product?: ProductsUpdateResponse["product"]
  }
}
