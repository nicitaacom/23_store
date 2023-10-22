import { create } from "zustand"
import { devtools, persist } from "zustand/middleware"
import { ICartProduct } from "@/interfaces/ICartProduct"
import useUserStore from "./userStore"
import getCartFromDB from "@/actions/getCartFromDB"

type Products = Record<string, ICartProduct>

interface CartStore {
  initialize: (isAuthenticated: boolean) => void
  products: Products
  getCartQuantity: () => number
  increaseProductQuantity: (id: string) => void
  decreaseProductQuantity: (id: string) => void
  clearProductQuantity: (id: string) => void
  // clearCartQuantity: () => void
}

const userStore = useUserStore

// function increaseProductQuantityInLocalStorage(cartProducts: ICartProduct[], product: IProduct) {
//   const updatedProducts = cartProducts
//   const productInCartIndex = updatedProducts.findIndex(productInCart => productInCart.id === product.id)
//   if (productInCartIndex === -1) {
//     //Add new product in  cart if it doesn't exist
//     updatedProducts.push({ ...product, quantity: 1 })
//   } else {
//     // If product already exists - update the quantity
//     updatedProducts[productInCartIndex].on_stock === updatedProducts[productInCartIndex].quantity
//       ? updatedProducts[productInCartIndex].quantity
//       : (updatedProducts[productInCartIndex].quantity += 1)
//   }
//   return updatedProducts
// }

// function decreaseProductQuantityInLocalStorage(cartProducts: ICartProduct[], product: IProduct) {
//   let updatedProducts = cartProducts
//   const productInCartIndex = updatedProducts.findIndex(productInCart => productInCart.id === product.id)

//   //if product in  cart doen't exist - quantity 0
//   productInCartIndex === -1
//     ? 0
//     : //if product in anonomous cart exist - quantity -= 1
//       (updatedProducts[productInCartIndex].quantity -= 1)

//   //keep product in array only if updatedProduct.quantity > 0
//   updatedProducts = updatedProducts.filter(updatedProduct => updatedProduct.quantity > 0)
//   return updatedProducts
// }

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
  // increaseProductQuantity(product: IProduct) {
  //   set((state: CartStore) => ({
  //     ...state,
  //     //update cartQuantity first
  //     cartQuantity:
  //       state.cartProducts.findIndex(cartProduct => cartProduct.id === product.id) === -1
  //         ? (state.cartQuantity += 1)
  //         : state.cartProducts[state.cartProducts.findIndex(item => item.id === product.id)].quantity ===
  //           state.cartProducts[state.cartProducts.findIndex(item => item.id === product.id)].on_stock
  //         ? state.cartQuantity
  //         : (state.cartQuantity += 1),
  //     cartProducts: increaseProductQuantityInLocalStorage(state.cartProducts, product),
  //   }))
  // },
  // decreaseProductQuantity(product: IProduct) {
  //   set((state: CartStore) => ({
  //     ...state,
  //     cartProducts: decreaseProductQuantityInLocalStorage(state.cartProducts, product),
  //     cartQuantity: state.cartQuantity === 0 ? 0 : state.cartQuantity - 1,
  //   }))
  // },
  async initialize(isAuthenticated) {
    if (!isAuthenticated) {
      return useCartStore.persist.rehydrate()
    }
    // const cartDB = await getCartFromDB()
    // console.log(139, "cartDB - ", cartDB)
  },
})

const useCartStore = create(devtools(persist(cartStore, { name: "cart", skipHydration: true })))

export default useCartStore
