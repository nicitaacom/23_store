import { TProductVariant } from "./TProductVariant"

export type TProductDB = {
  price_id: string
  owner_id: string
  id: string // its prod_id
  title: string
  sub_title: string
  price: number
  img_url: string[]
  variants?: TProductVariant[] | null
  on_stock?: number | null // created initially but now not needed because the way I created this store
}
