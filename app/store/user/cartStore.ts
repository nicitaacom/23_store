import { create } from "zustand"
import { subscribeWithSelector } from "zustand/middleware"
import { TRecordCartProduct } from "@/interfaces/TRecordCartProduct"
import { getStorage } from "@/utils/getStorage"
import { IDBProduct } from "@/interfaces/IDBProduct"
import supabaseClient from "@/utils/supabaseClient"

interface CartStore {
  products: TRecordCartProduct
  productsData: IDBProduct[]
  getCartQuantity: () => number
  increaseProductQuantity: (id: string) => void
  decreaseProductQuantity: (id: string) => void
  clearProductQuantity: (id: string) => void
  hasProducts: () => boolean
  clearCart: () => void
  initialize: () => void
  fetchProductsData: () => Promise<void>
}

type SetState = (fn: (prevState: CartStore) => Partial<CartStore>) => void
type GetState = () => CartStore

const cartStore = (set: SetState, get: GetState): CartStore => ({
  products: {},
  productsData: [],
  async fetchProductsData() {
    const ids = Object.keys(get().products)
    const cart_products_data_response = await supabaseClient.from("products").select().in("id", ids)
    const cart_products = cart_products_data_response.data ?? []

    set(() => ({
      productsData: cart_products,
    }))
  },
  getCartQuantity() {
    return Object.keys(get().products).reduce((accum, current) => {
      const { quantity } = get().products[current]
      accum += quantity
      return accum
    }, 0)
  },

  increaseProductQuantity(id: string) {
    const updatedProducts = { ...get().products }

    const product = updatedProducts[id]

    if (product) {
      updatedProducts[id].quantity++
    } else {
      updatedProducts[id] = {
        id,
        quantity: 1,
      }
    }

    set(() => ({
      products: updatedProducts,
    }))
  },
  decreaseProductQuantity(id: string) {
    const updatedProducts = { ...get().products }

    const product = updatedProducts[id]

    if (!product) return

    if (product.quantity === 1) {
      delete updatedProducts[id]
    } else {
      updatedProducts[id].quantity--
    }

    set(() => ({
      products: updatedProducts,
    }))
  },
  clearProductQuantity(id: string) {
    const updatedProducts = { ...get().products }

    const product = updatedProducts[id]

    if (!product) return
    else {
      delete updatedProducts[id]
    }

    set(() => ({
      products: updatedProducts,
    }))
  },
  clearCart() {
    set(() => ({
      products: {},
    }))
  },
  hasProducts() {
    return Object.keys(get().products).length > 0
  },
  async initialize() {
    if (typeof window === "undefined") return
    const storage = getStorage()
    const products = await storage.getProducts()
    set(() => ({
      products,
    }))
  },
})

const useCartStore = create(subscribeWithSelector(cartStore))

useCartStore.subscribe(
  state => state.products,
  products => {
    if (typeof window === "undefined") return
    const storage = getStorage()
    storage.saveProducts(products)
  },
)

export default useCartStore
