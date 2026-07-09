import { TProductVariant } from "./TProductVariant"
import { TProductDB } from "./TProductDB"

export type TProductAfterDB = TProductDB & {
  basePrice: number
  cartKey: string
  quantity: number
  selectedVariant: TProductVariant | null
  variantId: string | null
}
