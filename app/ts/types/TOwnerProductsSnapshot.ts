import { TProductDB } from "@/ts/product/TProductDB"

export type TOwnerProductsSnapshot = {
  products: TProductDB[]
  error: string | null
}
