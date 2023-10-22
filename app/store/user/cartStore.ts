import { create } from "zustand"
import { subscribeWithSelector } from "zustand/middleware"
import { TRecordCartProduct } from "@/interfaces/TRecordCartProduct"
import { getStorage } from "@/utils/getStorage"

interface CartStore {
  initialize: () => void
  products: TRecordCartProduct
  getCartQuantity: () => number
  increaseProductQuantity: (id: string) => void
  decreaseProductQuantity: (id: string) => void
  clearProductQuantity: (id: string) => void
  clearCart: () => void
}

type SetState = (fn: (prevState: CartStore) => Partial<CartStore>) => void
type GetState = () => CartStore

const cartStore = (set: SetState, get: GetState): CartStore => ({
  products: {},
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
      updatedProducts[id].quantity = 0
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
  async initialize() {
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
    const storage = getStorage()
    storage.saveProducts(products)
  },
)

export default useCartStore
