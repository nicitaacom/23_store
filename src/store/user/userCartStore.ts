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
  totalPrice: () => number
  increaseProductQuantity: (product: IProduct) => void
  decreaseProductQuantity: (product: IProduct) => void
  setProductQuantity0: (product: IProduct) => void
  setCartQuantity0: () => void
}

export const totalPriceLogic = (products: IProduct[]): number => {
  const totalPrice = products.reduce((totalPrice, product) => totalPrice + product.price * product.quantity, 0)
  return totalPrice
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
    increaseProductQuantityInDB()
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
          cart_products: updatedProducts,
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
  let updatedProducts = [...products]
  const existingProductIndex = updatedProducts.findIndex(item => item.id === product.id)

  updatedProducts[existingProductIndex].quantity === 0
    ? updatedProducts[existingProductIndex].quantity
    : ((updatedProducts[existingProductIndex].quantity -= 1), decreaseProductQuantityInDB())

  //delete product from array if product.quantity === 0
  updatedProducts = updatedProducts.filter(product => product.quantity > 0)

  async function decreaseProductQuantityInDB() {
    const userLocalStorage = localStorage.getItem("sb-ambgxbbsgequlwnbzchr-auth-token")
    if (userLocalStorage) {
      const parsedLS = JSON.parse(userLocalStorage)
      const { error } = await supabase
        .from("users_cart")
        .update({
          cart_products: updatedProducts.filter(product => product.quantity > 0),
          cart_quantity: cartQuantity - 1,
        })
        .eq("id", parsedLS.user.id)
      if (error) throw error
    }
  }
  return updatedProducts
}

export const setProductQuantity0Logic = (products: IProduct[], product: IProduct, cartQuantity: number): IProduct[] => {
  let updatedProducts = [...products]
  const existingProductIndex = updatedProducts.findIndex(item => item.id === product.id)

  //cart_quantity - product.quantity first
  const productQuantity = updatedProducts[existingProductIndex].quantity
  updatedProducts[existingProductIndex].quantity = 0
  updatedProducts = updatedProducts.filter(product => product.quantity > 0)

  const userLocalStorage = localStorage.getItem("sb-ambgxbbsgequlwnbzchr-auth-token")
  if (userLocalStorage) {
    const parsedLS = JSON.parse(userLocalStorage)
    setProductQuantity0InDB()

    async function setProductQuantity0InDB() {
      const { error } = await supabase
        .from("users_cart")
        .update({
          cart_products: updatedProducts.filter(product => product.quantity > 0),
          cart_quantity: cartQuantity - productQuantity,
        })
        .eq("id", parsedLS.user.id)
      if (error) throw error
    }
  }

  return updatedProducts
}

export const setCartQuantity0Logic = (products: IProduct[]) => {
  let updatedProducts = [...products]
  updatedProducts = []

  const userLocalStorage = localStorage.getItem("sb-ambgxbbsgequlwnbzchr-auth-token")
  if (userLocalStorage) {
    const parsedLS = JSON.parse(userLocalStorage)
    setCartQuantity0InDB()
    async function setCartQuantity0InDB() {
      const { error } = await supabase
        .from("users_cart")
        .update({
          cart_products: updatedProducts,
          cart_quantity: 0,
        })
        .eq("id", parsedLS.user.id)
      if (error) throw error
    }
  }

  return updatedProducts
}

type SetState = (fn: (prevState: UserCartStore) => UserCartStore) => void

const userCartStore = (set: SetState): UserCartStore => ({
  products: [],
  cartQuantity: 0,
  totalPrice() {
    return totalPriceLogic(this.products)
  },
  increaseProductQuantity(product: IProduct) {
    set((state: UserCartStore) => ({
      ...state,
      cartQuantity:
        [...state.products].findIndex(item => item.id === product.id) === -1
          ? state.cartQuantity + 1
          : [...state.products][[...state.products].findIndex(item => item.id === product.id)].on_stock ===
            [...state.products][[...state.products].findIndex(item => item.id === product.id)].quantity
          ? state.cartQuantity
          : state.cartQuantity + 1,
      products: increaseProductQuantityLogic(state.products, product, state.cartQuantity),
    }))
  },
  decreaseProductQuantity(product: IProduct) {
    set((state: UserCartStore) => ({
      ...state,
      products: decreaseProductQuantityLogic(state.products, product, state.cartQuantity),
      cartQuantity: state.cartQuantity === 0 ? 0 : state.cartQuantity - 1,
    }))
  },
  setProductQuantity0(product: IProduct) {
    set((state: UserCartStore) => ({
      ...state,
      cartQuantity:
        [...state.products].findIndex(item => item.id === product.id) === -1
          ? state.cartQuantity
          : state.cartQuantity -
            [...state.products][[...state.products].findIndex(item => item.id === product.id)].quantity,
      products:
        [...state.products].findIndex(item => item.id === product.id) === -1
          ? state.products
          : setProductQuantity0Logic(state.products, product, state.cartQuantity),
    }))
  },
  setCartQuantity0() {
    set((state: UserCartStore) => ({
      ...state,
      products: setCartQuantity0Logic(state.products),
      cartQuantity: 0,
    }))
  },
})

const useUserCartStore = create(devtools(persist(userCartStore, { name: "userCartStore" })))

export default useUserCartStore
