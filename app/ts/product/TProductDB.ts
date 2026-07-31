import { TProductPersonalization } from "./TPersonalization"
import { TProductVariant } from "./TProductVariant"

export type TProductTranslation = { title: string; description: string }
export type TProductTranslations = Record<"en" | "fi" | "ru" | "se", TProductTranslation>

export type TProductDB = {
  price_id: string
  owner_id: string
  id: string // prod_id
  translations: TProductTranslations
  price: number // base price, used when no variant selected
  img_url: string[]
  variants?: TProductVariant[] | null
  on_stock: number
  created_at?: string
  category_id?: string | null
  // Social signals — drive /popular-products (most likes first). avg rating = rating_sum / rating_count.
  likes_count?: number
  rating_sum?: number
  rating_count?: number
  // How many buyers pressed "Request replenishment" on a sold-out product.
  replanishment_requests_count?: number
  // Print area + mockup config - null/absent means the product has no Personalize button.
  personalization?: TProductPersonalization | null
  ai_pricing_enabled?: boolean
  ai_price_baseline?: number | null
}
