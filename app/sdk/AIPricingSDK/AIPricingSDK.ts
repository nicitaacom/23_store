import { BaseSDK } from "@/sdk/BaseSDK"

export class AIPricingSDK extends BaseSDK {
  async getSettings() {
    return this.getJson<API.AIPriceSettingsResponse>("/api/products/ai-pricing")
  }

  async updateSettings(request: API.AIPriceSettingsUpdateRequest) {
    return this.postJson<API.AIPriceSettingsUpdateRequest, API.AIPriceSettingsUpdateResponse>(
      "/api/products/ai-pricing",
      request,
      { method: "PATCH" },
    )
  }

  async approveProposal(proposalId: string) {
    return this.postJson<Record<string, never>, API.AIPriceProposalReviewResponse>(
      `/api/products/price-proposals/${proposalId}/approve`,
      {},
    )
  }

  async rejectProposal(proposalId: string) {
    return this.postJson<Record<string, never>, API.AIPriceProposalReviewResponse>(
      `/api/products/price-proposals/${proposalId}/reject`,
      {},
    )
  }
}

export const aiPricingSDK = new AIPricingSDK()
