import { TProductVariant } from "./TProductVariant"

export type ProductTranslation = { title: string; description: string }
export type ProductTranslations = Record<"en" | "fi" | "ru" | "se", ProductTranslation>

export type TProductDB = {
  price_id: string
  owner_id: string
  id: string // prod_id
  translations: ProductTranslations
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
}
