import { TBuyingFlowEvent } from "../types/TBuyingFlowEvent"
import { TCheckoutKind } from "@/config/buyingFlowConfig"

export interface IBuyingFlowEventInput {
  event: TBuyingFlowEvent
  storedDeviceId: string | null
  sessionId: string
  pageUrl: string
  locale: string
  productId?: string
  checkoutKind?: TCheckoutKind
  searchQuery?: string
  resultsCount?: number
}
