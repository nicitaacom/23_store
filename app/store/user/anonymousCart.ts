import { create } from "zustand"
import { devtools, persist } from "zustand/middleware"
import { IProduct } from "../../interfaces/IProduct"
import { ICartProduct } from "@/interfaces/ICartProduct"

interface AnonymousCartStore {
  cartProducts: ICartProduct[]
  cartQuantity: number
  increaseProductQuantity: (product: IProduct) => void
  decreaseProductQuantity: (product: IProduct) => void
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

function decreaseProductQuantityInLocalStorage(cartProducts: ICartProduct[], product: IProduct) {
  let updatedProducts = cartProducts
  const productInCartIndex = updatedProducts.findIndex(productInCart => productInCart.id === product.id)

  //if product in anonymous cart doen't exist - quantity 0
  productInCartIndex === -1
    ? 0
    : //if product in anonomous cart exist - quantity -= 1
      (updatedProducts[productInCartIndex].quantity -= 1)

  //keep product in array only if updatedProduct.quantity > 0
  updatedProducts = updatedProducts.filter(updatedProduct => updatedProduct.quantity > 0)
  return updatedProducts
}

type SetState = (fn: (prevState: AnonymousCartStore) => AnonymousCartStore) => void

const anonymousCartStore = (set: SetState): AnonymousCartStore => ({
  cartProducts: [],
  cartQuantity: 0,
  increaseProductQuantity(product: IProduct) {
    set((state: AnonymousCartStore) => ({
      ...state,
      //update cartQuantity first
      cartQuantity:
        state.cartProducts.findIndex(cartProduct => cartProduct.id === product.id) === -1
          ? (state.cartQuantity += 1)
          : state.cartProducts[state.cartProducts.findIndex(item => item.id === product.id)].quantity ===
            state.cartProducts[state.cartProducts.findIndex(item => item.id === product.id)].on_stock
          ? state.cartQuantity
          : (state.cartQuantity += 1),
      cartProducts: increaseProductQuantityInLocalStorage(state.cartProducts, product),
    }))
  },
  decreaseProductQuantity(product: IProduct) {
    set((state: AnonymousCartStore) => ({
      ...state,
      cartProducts: decreaseProductQuantityInLocalStorage(state.cartProducts, product),
      cartQuantity: state.cartQuantity === 0 ? 0 : state.cartQuantity - 1,
    }))
  },
})

const useAnonymousCartStore = create(devtools(persist(anonymousCartStore, { name: "anonymousCartStore" })))

export default useAnonymousCartStore
