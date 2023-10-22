import { TRecordCartProduct } from "@/interfaces/TRecordCartProduct"
import { Storage } from "./Storage"

export class LocalStorage extends Storage {
  saveProducts(cartProducts: TRecordCartProduct): void {
    typeof window !== undefined ? localStorage.setItem("cart", JSON.stringify(cartProducts)) : false
  }
  getProducts(): Promise<TRecordCartProduct> {
    const cart = typeof window !== undefined ? localStorage.getItem("cart") ?? "{}" : "{}"
    return JSON.parse(cart)
  }
}
