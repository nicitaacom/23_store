import { TRecordCartProduct } from "@/interfaces/product/TRecordCartProduct"
import { Storage } from "./Storage"

export class LocalStorage extends Storage {
  saveProducts(cartProducts: TRecordCartProduct): void {
    localStorage.setItem("cart", JSON.stringify(cartProducts))
  }
  getProducts(): Promise<TRecordCartProduct> {
    const cart = localStorage.getItem("cart") ?? "{}"
    return JSON.parse(cart)
  }
}
