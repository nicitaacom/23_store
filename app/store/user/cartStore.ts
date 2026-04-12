import { create } from "zustand"
import { subscribeWithSelector } from "zustand/middleware"
import { TRecordCartProduct } from "@/ts/product/TRecordCartProduct"
import { getStorage } from "@/utils/getStorage"
import supabaseClient from "@/libs/supabase/supabaseClient"
import { TProductAfterDB } from "@/ts/product/TProductAfterDB"
import useUserStore from "./userStore"
import { logFn } from "@/utils/logFn"
import { normalizeProducts } from "@/utils/productVariants"
import { createCartProductKey, getProductVariantById } from "@/utils/cartProducts"
import { Json } from "@/ts/types_db"

interface CartStore {
  products: TRecordCartProduct
  productsData: TProductAfterDB[]
  keepExistingProductsRecord: (food: TRecordCartProduct) => Promise<TRecordCartProduct> // for case I user delete some food
  fetchProductsData: () => Promise<void>
  getCartQuantity: () => number
  increaseProductQuantity: (id: string, variantId?: string | null) => void
  decreaseProductQuantity: (id: string, variantId?: string | null) => void
  clearProductQuantity: (id: string, variantId?: string | null) => void
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
    if (!products || Object.values(products).length === 0) {
      set(() => ({
        productsData: [],
      }))
      return
    }

    // fetch products data only if some products in cart
    // otherwise everytime I fetch data I neeed to check is some products in reacord to featch
    logFn("products - ", products)
    const keepExistingProductsRecord = get().keepExistingProductsRecord
    const productsRecord = get().products
    const existingProductsRecord = await keepExistingProductsRecord(productsRecord)
    const ids = [...new Set(Object.values(existingProductsRecord).map(product => product.id).filter(Boolean))]
    const cart_products_data_response = await supabaseClient.from("23_products").select().in("id", ids)
    const cart_products = normalizeProducts(cart_products_data_response.data ?? []) // get data from DB product with ids
    const productMap = new Map(cart_products.map(product => [product.id, product]))

    const cart_products_with_quantity = Object.entries(existingProductsRecord).reduce<TProductAfterDB[]>((accum, [cartKey, cartProduct]) => {
        const productData = productMap.get(cartProduct.id)
        if (!productData) return accum

        const selectedVariant = getProductVariantById(productData, cartProduct.variantId)
        const linePrice = selectedVariant?.price ?? productData.price

        accum.push({
          ...productData,
          basePrice: productData.price,
          cartKey,
          price: linePrice,
          quantity: cartProduct.quantity,
          selectedVariant,
          variantId: selectedVariant?.id ?? cartProduct.variantId ?? null,
        })

        return accum
      }, [])

    set(() => ({
      products: existingProductsRecord,
      productsData: cart_products_with_quantity,
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
  increaseProductQuantity(id: string, variantId?: string | null) {
    const updatedProducts = { ...get().products }
    const cartKey = createCartProductKey(id, variantId)
    const updatedProductsData = get().productsData.map(productData =>
      productData.cartKey === cartKey ? { ...productData, quantity: productData.quantity + 1 } : productData,
    )
    const product = updatedProducts[cartKey]

    // if user try to add more product in cart than on stock
    // ignore on_stock due to new store implementation
    // if (product && product.quantity === on_stock) return

    if (product) {
      updatedProducts[cartKey].quantity++
    } else {
      updatedProducts[cartKey] = {
        id,
        quantity: 1,
        variantId: variantId ?? null,
        //no sence to create logic because I don't add product in cart
        //I can add prodcut in store
      }
    }

    set(() => ({
      products: updatedProducts,
      productsData: updatedProductsData,
    }))
  },

  decreaseProductQuantity(id: string, variantId?: string | null) {
    const updatedProducts = { ...get().products }
    let updatedProductsData = [...get().productsData]
    const cartKey = createCartProductKey(id, variantId)
    const product = updatedProducts[cartKey]

    if (!product) return

    if (product.quantity === 1) {
      delete updatedProducts[cartKey]
      updatedProductsData = updatedProductsData.filter(updatedProduct => updatedProduct.cartKey !== cartKey)
    } else {
      updatedProducts[cartKey].quantity--
      updatedProductsData = updatedProductsData.map(updatedProduct =>
        updatedProduct.cartKey === cartKey ? { ...updatedProduct, quantity: updatedProduct.quantity - 1 } : updatedProduct,
      )
    }

    set(() => ({
      products: updatedProducts,
      productsData: updatedProductsData,
    }))
  },
  clearProductQuantity(id: string, variantId?: string | null) {
    const updatedProducts = { ...get().products }
    let updatedProductsData = [...get().productsData]
    const cartKey = createCartProductKey(id, variantId)
    const product = updatedProducts[cartKey]

    if (!product) return
    delete updatedProducts[cartKey]
    updatedProductsData = updatedProductsData.filter(updatedProduct => updatedProduct.cartKey !== cartKey)

    set(() => ({
      products: updatedProducts,
      productsData: updatedProductsData,
    }))
  },
  getProductsPrice() {
    return get().productsData.reduce((totalPrice, product) => {
      return product.on_stock === 0 ? totalPrice : totalPrice + product.price * product.quantity
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
    if (!products || Object.keys(products).length === 0) return {}

    const ids = [...new Set(Object.values(products).map(product => product.id).filter(Boolean))]
    const { data: existing_ids_response } = await supabaseClient.from("23_products").select("id").in("id", ids)
    const existing_ids = existing_ids_response ?? [] // array with existing objects id in DB [{id:'prod_id'}]
    const updatedIds = existing_ids.map(productData => productData.id) // string[] ['id']

    const filtered_products = Object.entries(products).reduce<TRecordCartProduct>((accum, [cartKey, cartProduct]) => {
      if (updatedIds.includes(cartProduct.id)) {
        accum[cartKey] = cartProduct
      }
      return accum
    }, {})

    const isNotExistingProductFound = Object.keys(products).length !== Object.keys(filtered_products).length

    // if found not existing product record - delete it from DB
    const { user } = useUserStore.getState()
    if (user?.id && isNotExistingProductFound) {
      const { error: update_cart_food_error } = await supabaseClient
        .from(\"23_users_cart\")
        .update({ cart_products: filtered_products as unknown as Json })
        .eq("id", user.id)
      if (update_cart_food_error) throw update_cart_food_error
    }

    return filtered_products
  },
  async initialize() {
    if (typeof window === "undefined") return

    const keepExistingProductsRecord = get().keepExistingProductsRecord
    const storage = getStorage()
    const products = await storage.getProducts() // get products from localstorage or DB based on isAuthenticated
    const existingProducts = await keepExistingProductsRecord(products || {}) // keep in record only existing productis in DB

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
