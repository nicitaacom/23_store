import { TProductVariant } from "./TProductVariant"

export type ProductTranslation = { title: string; description: string }
export type ProductTranslations = Record<"en" | "fi" | "ru" | "se", ProductTranslation>

export type TProductDB = {
  price_id: string
  owner_id: string
  id: string // prod_id
  translations: ProductTranslations
  price: number
  img_url: string[]
  variants?: TProductVariant[] | null
  on_stock: number
}
