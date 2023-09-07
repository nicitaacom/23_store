import { create } from "zustand"
import { devtools, persist } from "zustand/middleware"
import supabase from "../../utils/supabaseClient"

export interface IProduct {
  id: string
  title: string
  sub_title: string
  price: number
  img_url: string
  on_stock: number
  quantity: number
}

interface UserCartStore {
  products: IProduct[]
  cartQuantity: number
  increaseProductQuantity: (product: IProduct) => void
  decreaseProductQuantity: (product: IProduct) => void
  setCartQuantityFromDB: (cartQuantity: number) => void
  setItemQuantity0: (id: string) => void
}

export const getProductQuantityLogic = (products: IProduct[], id: string) => {
  const product = products.find(produt => produt.id === id)
  console.log(27, "product.quantity - ", product?.quantity)
  return product?.quantity
}

export const increaseProductQuantityLogic = (
  products: IProduct[],
  product: IProduct,
  cartQuantity: number,
): IProduct[] => {
  const updatedProducts = [...products]
  const existingProductIndex = updatedProducts.findIndex(item => item.id === product.id)

  if (existingProductIndex === -1) {
    // Add new product if it doesn't exist in cart
    updatedProducts.push({ ...product, quantity: product.quantity + 1 })
  } else {
    // If product already exists - update the quantity
    updatedProducts[existingProductIndex].on_stock === updatedProducts[existingProductIndex].quantity
      ? updatedProducts[existingProductIndex].quantity
      : ((updatedProducts[existingProductIndex].quantity += 1), increaseProductQuantityInDB())
  }

  async function increaseProductQuantityInDB() {
    const userLocalStorage = localStorage.getItem("sb-ambgxbbsgequlwnbzchr-auth-token")
    if (userLocalStorage) {
      const parsedLS = JSON.parse(userLocalStorage)

      const { error } = await supabase
        .from("users_cart")
        .update({
          cart_products: [...products],
          cart_quantity: cartQuantity + 1,
        })
        .eq("id", parsedLS.user.id)
      if (error) throw error
    }
  }
  return updatedProducts
}

export const decreaseProductQuantityLogic = (
  products: IProduct[],
  product: IProduct,
  cartQuantity: number,
): IProduct[] => {
  const updatedProducts = [...products]
  const existingProductIndex = updatedProducts.findIndex(item => item.id === product.id)

  updatedProducts[existingProductIndex].quantity === 0
    ? updatedProducts[existingProductIndex].quantity
    : ((updatedProducts[existingProductIndex].quantity -= 1), decreaseProductQuantityInDB())

  async function decreaseProductQuantityInDB() {
    const userLocalStorage = localStorage.getItem("sb-ambgxbbsgequlwnbzchr-auth-token")
    if (userLocalStorage) {
      const parsedLS = JSON.parse(userLocalStorage)

      const { error } = await supabase
        .from("users_cart")
        .update({
          cart_products: [...products],
          cart_quantity: cartQuantity + 1,
        })
        .eq("id", parsedLS.user.id)
      if (error) throw error
    }
  }
  return updatedProducts
}

export const setCartQuantityFromDB = (cartQuantity: number) => {
  console.log(52, "setCartQuantityFromDB")
  //I don't do backend request here because I want useEffect to fire this function
  //I mean I don't call this function on click
  return cartQuantity
}

export const setItemQuantity0 = (products: IProduct[], id: string): IProduct[] => {
  console.log(59, "setItemQuantity0")

  return products.map(product => {
    if (product.id === id) {
      return {
        ...product,
        quantity: product.quantity ? (product.quantity = 0) : 1,
      }
    }
    return product
  })
}

// export const setUserCartFromDB = (products: IProduct[], cartQuantity: number): IProduct[] => {
//   console.log(75, "setUserCartFromDB")

//   return {}
// }

type SetState = (fn: (prevState: UserCartStore) => UserCartStore) => void

const userCartStore = (set: SetState): UserCartStore => ({
  products: [],
  cartQuantity: 0,
  increaseProductQuantity(product: IProduct) {
    set((state: UserCartStore) => ({
      ...state,
      products: increaseProductQuantityLogic(state.products, product, state.cartQuantity),
      cartQuantity: state.cartQuantity + 1,
    }))
  },
  decreaseProductQuantity(product: IProduct) {
    set((state: UserCartStore) => ({
      ...state,
      products: decreaseProductQuantityLogic(state.products, product, state.cartQuantity),
      cartQuantity: state.cartQuantity === 0 ? 0 : state.cartQuantity - 1,
    }))
  },
  setCartQuantityFromDB(cartQuantity: number) {
    set((state: UserCartStore) => ({
      ...state,
      cartQuantity: cartQuantity,
    }))
  },
  setItemQuantity0(id: string) {
    set((state: UserCartStore) => ({
      ...state,
      products: setItemQuantity0(state.products, id),
    }))
  },
})

const useUserCartStore = create(devtools(persist(userCartStore, { name: "userCartStore" })))

export default useUserCartStore
