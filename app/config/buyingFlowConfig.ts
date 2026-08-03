import { TBuyingFlowEvent } from "@/ts/types/TBuyingFlowEvent"

export const CHECKOUT_KINDS = ["request_better_prices", "stripe", "paypal", "metamask", "solana"] as const
export type TCheckoutKind = (typeof CHECKOUT_KINDS)[number]

export const BUYING_FLOW_STAGES: { event: "visited" | TBuyingFlowEvent; label: string }[] = [
  { event: "visited", label: "Visited" },
  { event: "product_view", label: "Viewed" },
  { event: "add_to_cart", label: "Added" },
  { event: "cart_open", label: "Cart" },
  { event: "checkout_click", label: "Checkout" },
]

export const BUYING_FLOW_CAPS = { searchQuery: 200, url: 2000, productId: 100 } as const
