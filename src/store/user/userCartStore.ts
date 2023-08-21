import { create } from "zustand"
import { devtools, persist } from "zustand/middleware"
import supabase from "../../utils/supabaseClient"

export interface IProduct {
  id: string
  label: string
  price: number
  img_url: string
  quantity: number
}

interface UserCartStore {
  products: IProduct[]
  cartQuantity: number
  setCartQuantityFromDB: (cartQuantity: number) => void
  increaseItemQuantity: (id: string) => void
  decreaseItemQuantity: (id: string) => void
  setItemQuantity0: (id: string) => void
}

export const increaseItemQuantityinDB = async (id: string) => {
  //db manipulations here
  const { data } = await supabase.from("products").select("id, label, price, img_url").eq("id", id)

  return data && data.length > 0
    ? {
      id: data[0].id,
      label: data[0].label,
      price: data[0].price,
      img_url: data[0].img_url,
      quantity: 1, //logic
    }
    : null
}

export const decreaseItemQuantity = (products: IProduct[], id: string): IProduct[] => {
  return products.map(product => {
    if (product.id === id) {
      return {
        ...product,
        quantity: product.quantity ? product.quantity - 1 : 0,
      }
    }
    return product
  })
}

export const setCartQuantityFromDB = (cartQuantity: number) => {
  //I don't do backend request here because I want useEffect to fire this function
  //I mean I don't call this function on click
  return cartQuantity
}

export const setItemQuantity0 = (products: IProduct[], id: string): IProduct[] => {
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

type SetState = (fn: (prevState: UserCartStore) => UserCartStore) => void

const userCartStore = (set: SetState): UserCartStore => ({
  products: [],
  cartQuantity: 0,
  async increaseItemQuantity(id: string) {
    const newProduct = await increaseItemQuantityinDB(id)
    if (newProduct)
      set((state: UserCartStore) => ({
        ...state,
        products: [...state.products, newProduct],
        cartQuantity: this.cartQuantity + 1,
      }))
  },
  decreaseItemQuantity(id: string) {
    set((state: UserCartStore) => ({
      ...state,
      products: decreaseItemQuantity(state.products, id),
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