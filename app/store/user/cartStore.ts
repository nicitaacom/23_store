import { create } from "zustand"
import { subscribeWithSelector } from "zustand/middleware"
import { TRecordCartProduct } from "@/interfaces/TRecordCartProduct"
import { getStorage } from "@/utils/getStorage"
import supabaseClient from "@/libs/supabaseClient"
import { IProduct } from "@/interfaces/IProduct"
import useUserStore from "./userStore"

interface CartStore {
  products: TRecordCartProduct
  productsData: IProduct[]
  fetchProductsData: () => Promise<void>
  getCartQuantity: () => number
  increaseProductQuantity: (id: string) => void
  decreaseProductQuantity: (id: string) => void
  clearProductQuantity: (id: string) => void
  getProductsPrice: () => number
  hasProducts: () => boolean
  clearCart: () => void
  initialize: () => void
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
    //add quantity to productsData
    const updated_cart_products = cart_products.map(productData => {
      const quantity = get().products[productData.id].quantity ?? 0
      return { ...productData, quantity }
    })
    //for case if product owner deleted prodcut - update column in 'cart_products'
    const updatedIds = cart_products.map(productData => productData.id)
    const filtered_products = Object.keys(get().products)
      .filter(key => updatedIds.includes(key))
      .reduce((obj: any, key) => {
        obj[key] = get().products[key]
        return obj
      }, {})
    const { userId } = useUserStore.getState()
    if (userId) {
      const { error: update_cart_products_error } = await supabaseClient
        .from("users_cart")
        .update({ cart_products: filtered_products })
        .eq("id", userId)
      if (update_cart_products_error) throw update_cart_products_error
    }
    set(() => ({
      products: filtered_products,
      productsData: updated_cart_products,
    }))
  },
  getCartQuantity() {
    //I check get().products because when I authenticated I got error
    return get().products
      ? Object.keys(get().products).reduce((accum, current) => {
          const { quantity } = get().products[current]
          accum += quantity
          return accum
        }, 0)
      : 0
  },

  increaseProductQuantity(id: string) {
    const updatedProducts = { ...get().products }
    let updatedProductsData = [...get().productsData]

    const product = updatedProducts[id]

    if (product) {
      updatedProducts[id].quantity++
      updatedProductsData.map(updatedProduct => {
        if (updatedProduct.id === id) {
          return { ...updatedProduct, quantity: updatedProduct.quantity++ }
        } else return updatedProduct
      })
    } else {
      updatedProducts[id] = {
        id,
        quantity: 1,
        //no sence to create logic because I don't add product in cart
        //I can add prodcut in store
      }
    }

    set(() => ({
      products: updatedProducts,
    }))
  },
  decreaseProductQuantity(id: string) {
    const updatedProducts = { ...get().products }
    let updatedProductsData = [...get().productsData]

    const product = updatedProducts[id]

    if (!product) return

    if (product.quantity === 1) {
      delete updatedProducts[id]
      updatedProductsData = updatedProductsData.filter(updatedProduct => updatedProduct.id !== id)
    } else {
      updatedProducts[id].quantity--
      updatedProductsData.map(updatedProduct => {
        if (updatedProduct.id === id) {
          return { ...updatedProduct, quantity: updatedProduct.quantity-- }
        }
      })
    }

    set(() => ({
      products: updatedProducts,
      productsData: updatedProductsData,
    }))
  },
  clearProductQuantity(id: string) {
    const updatedProducts = { ...get().products }
    let updatedProductsData = [...get().productsData]

    const product = updatedProducts[id]

    if (!product) return
    delete updatedProducts[id]
    updatedProductsData = updatedProductsData.filter(updatedProduct => updatedProduct.id !== id)

    set(() => ({
      products: updatedProducts,
      productsData: updatedProductsData,
    }))
  },
  getProductsPrice() {
    return get().productsData.reduce((totalPrice, product) => {
      const quantity = get().products[product.id].quantity ?? 0
      return product.on_stock === 0 ? totalPrice : totalPrice + product.price * quantity
    }, 0)
  },
  clearCart() {
    set(() => ({
      products: {},
      productsData: [],
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
