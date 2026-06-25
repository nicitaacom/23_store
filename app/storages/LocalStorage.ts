import { TRecordCartProduct } from "@/ts/product/TRecordCartProduct"
import { useCartPersistedStore } from "@/store/user/useCartPersistedStore"
import { Storage } from "./Storage"

export class LocalStorage extends Storage {
  saveProducts(cartProducts: TRecordCartProduct): void {
    useCartPersistedStore.getState().setProducts(cartProducts)
  }
  getProducts(): Promise<TRecordCartProduct> {
    return Promise.resolve(useCartPersistedStore.getState().products)
  }
}
