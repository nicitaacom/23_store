import { TProductDB } from "./TProductDB"
import { TProductVariant } from "./TProductVariant"

export type TProductAfterDB = TProductDB & {
  basePrice: number
  cartKey: string
  quantity: number
  selectedVariant: TProductVariant | null
  variantId: string | null
}
