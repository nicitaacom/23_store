import type { TProductTranslations } from "./TProductDB"

/** The public product-card payload. Keep large admin, variant, and personalization fields out of the feed. */
export type TPopularProduct = {
  id: string
  price: number
  img_url: string[]
  translations: TProductTranslations
  likes_count?: number
  rating_sum?: number
  rating_count?: number
}
