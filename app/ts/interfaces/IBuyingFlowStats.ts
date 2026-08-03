import { TCheckoutKind } from "@/config/buyingFlowConfig"

export interface IBuyingFlowStats {
  stages: { stage: string; label: string; visitors: number }[]
  checkoutKinds: { kind: TCheckoutKind; clicks: number }[]
  searchMisses: { query: string; count: number }[]
  topSearches: { query: string; count: number }[]
}
