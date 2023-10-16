import { create } from "zustand"
import { devtools, persist } from "zustand/middleware"
import { IProduct } from "../../interfaces/IProduct"
import { ICartProduct } from "@/interfaces/ICartProduct"

interface AnonymousCartStore {
  cartProducts: ICartProduct[]
  cartQuantity: number
  increaseProductQuantity: (product: IProduct) => void
  // decreaseProductQuantity: (product: IProduct) => void
  // clearProductQuantity: (product: IProduct) => void
  // clearCartQuantity: () => void
}

function increaseProductQuantityInLocalStorage(cartProducts: ICartProduct[], product: IProduct) {
  const updatedProducts = cartProducts
  const productInCartIndex = updatedProducts.findIndex(productInCart => productInCart.id === product.id)
  if (productInCartIndex === -1) {
    //Add new product in anonymous cart if it doesn't exist
    updatedProducts.push({ ...product, quantity: 1 })
  } else {
    // If product already exists - update the quantity
    updatedProducts[productInCartIndex].on_stock === updatedProducts[productInCartIndex].quantity
      ? updatedProducts[productInCartIndex].quantity
      : (updatedProducts[productInCartIndex].quantity += 1)
  }
  return updatedProducts
}

type SetState = (fn: (prevState: AnonymousCartStore) => AnonymousCartStore) => void

const anonymousCartStore = (set: SetState): AnonymousCartStore => ({
  cartProducts: [],
  cartQuantity: 0,
  increaseProductQuantity(product: IProduct) {
    set((state: AnonymousCartStore) => ({
      ...state,
      cartProducts: increaseProductQuantityInLocalStorage(state.cartProducts, product),
      cartQuantity:
        state.cartProducts.findIndex(cartProduct => cartProduct.id === product.id) === -1
          ? state.cartQuantity + 1
          : state.cartProducts[state.cartProducts.findIndex(item => item.id === product.id)].quantity ===
            state.cartProducts[state.cartProducts.findIndex(item => item.id === product.id)].on_stock
          ? state.cartQuantity
          : state.cartQuantity + 1,
    }))
  },
})

const useAnonymousCartStore = create(
  devtools(persist(anonymousCartStore, { name: "anonymousCartStore", skipHydration: true })),
)

export default useAnonymousCartStore
