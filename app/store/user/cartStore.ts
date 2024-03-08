import { create } from "zustand"
import { subscribeWithSelector } from "zustand/middleware"
import { TRecordCartProduct } from "@/interfaces/product/TRecordCartProduct"
import { getStorage } from "@/utils/getStorage"
import supabaseClient from "@/libs/supabase/supabaseClient"
import { TProductAfterDB } from "@/interfaces/product/TProductAfterDB"
import useUserStore from "./userStore"

interface CartStore {
  products: TRecordCartProduct
  productsData: TProductAfterDB[]
  keepExistingProductsRecord: (food: TRecordCartProduct) => Promise<TRecordCartProduct> // for case I user delete some food
  fetchProductsData: () => Promise<void>
  getCartQuantity: () => number
  increaseProductQuantity: (id: string, on_stock: number) => void
  decreaseProductQuantity: (id: string) => void
  clearProductQuantity: (id: string) => void
  getProductsPrice: () => number
  hasProducts: () => boolean
  clearCart: () => void
  initialize: () => Promise<void>
}

type SetState = (fn: (prevState: CartStore) => Partial<CartStore>) => void
type GetState = () => CartStore

const cartStore = (set: SetState, get: GetState): CartStore => ({
  products: {},
  productsData: [],
  async fetchProductsData() {
    const products = get().products
    // fetch products data only if some products in cart
    // otherwise everytime I fetch data I neeed to check is some products in reacord to featch
    if (products && Object.values(products).length !== 0) {
      const keepExistingProductsRecord = get().keepExistingProductsRecord
      const productsRecord = get().products
      const existingProductsRecord = await keepExistingProductsRecord(productsRecord)
      const ids = Object.keys(existingProductsRecord) // get ids ['id1','id2','id3']
      const cart_products_data_response = await supabaseClient.from("products").select().in("id", ids)
      const cart_products = cart_products_data_response.data ?? [] // get data from DB product with ids

      // Add quantity to productsData
      const cart_products_with_quantity = cart_products.map(productData => {
        const quantity = get().products[productData.id].quantity ?? 0
        return { ...productData, quantity }
      })

      set(() => ({
        products: existingProductsRecord,
        productsData: cart_products_with_quantity,
      }))
    }
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
  increaseProductQuantity(id: string, on_stock: number) {
    const updatedProducts = { ...get().products }
    let updatedProductsData = [...get().productsData]

    const product = updatedProducts[id]

    // if user try to add more product in cart than on stock
    if (product && product.quantity === on_stock) return

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
      // TODO - check is it work fine when I increase quantity in cart (e.g from 2 to 3)
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
  async keepExistingProductsRecord(products: TRecordCartProduct) {
    if (!products) return
    const ids = Object.keys(products) // get object keys (prod_id)
    const { data: existing_ids_response } = await supabaseClient.from("products").select("id").in("id", ids)
    const existing_ids = existing_ids_response ?? [] // array with existing objects id in DB [{id:'prod_id'}]
    const updatedIds = existing_ids.map(productData => productData.id) // string[] ['id']

    const filtered_products = Object.keys(products) // array of existing records [prod_someId:{ICartProduct}]
      .filter(key => updatedIds.includes(key))
      .reduce((obj: any, key) => {
        obj[key] = products[key]
        return obj
      }, {})

    const isNotExistingProductFound = ids.some(id => !updatedIds.includes(id))

    // if found not existing product record - delete it from DB
    const { userId } = useUserStore.getState()
    if (userId && isNotExistingProductFound) {
      const { error: update_cart_food_error } = await supabaseClient
        .from("users_cart")
        .update({ cart_products: filtered_products })
        .eq("id", userId)
      if (update_cart_food_error) throw update_cart_food_error
    }

    return filtered_products
  },
  async initialize() {
    if (typeof window === "undefined") return
    const keepExistingProductsRecord = get().keepExistingProductsRecord
    const storage = getStorage()
    const products = await storage.getProducts() // get products from localstorage or DB based on isAuthenticated
    const existingProducts = await keepExistingProductsRecord(products) // keep in record only existing productis in DB

    set(() => ({
      products: existingProducts,
    }))
  },
})

const useCartStore = create(subscribeWithSelector(cartStore))

// subscribe to state.products changes if this state gets update - save products
useCartStore.subscribe(
  state => state.products,
  products => {
    if (typeof window === "undefined") return
    const storage = getStorage()
    storage.saveProducts(products)
  },
)

export default useCartStore
