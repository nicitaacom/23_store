import { create } from "zustand"
import { devtools, persist } from "zustand/middleware"

// Which products this user has bought. No orders table exists, so purchases live client-side
// (localStorage) like liked products. Written on payment success; used to decide like vs rate
// (you can rate a product only after buying it).
interface PurchasedProductsStore {
  purchasedProductIds: string[]
  addPurchasedProducts: (productIds: string[]) => void
}

type SetState = (fn: (prevState: PurchasedProductsStore) => PurchasedProductsStore) => void

const purchasedProductsStore = (set: SetState): PurchasedProductsStore => ({
  purchasedProductIds: [],
  addPurchasedProducts(productIds: string[]) {
    set(state => ({
      ...state,
      purchasedProductIds: [...new Set([...state.purchasedProductIds, ...productIds])],
    }))
  },
})

const usePurchasedProductsStore = create(devtools(persist(purchasedProductsStore, { name: "purchasedProducts" })))

export default usePurchasedProductsStore
