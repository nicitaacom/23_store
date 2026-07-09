import { TRecordCartProduct } from "@/ts/product/TRecordCartProduct"
import { Storage } from "./Storage"
import supabaseClient from "@/libs/supabase/supabaseClient"
import { Json } from "@/ts/types_db"
import { getUserId } from "@/utils/getUserId"

export class DBStorage extends Storage {
  async saveProducts(cartProducts: TRecordCartProduct): Promise<void> {
    const userId = getUserId()

    const { error } = await supabaseClient
      .from("23_users_cart")
      .update({ cart_products: cartProducts as unknown as Json })
      .eq("id", userId)
    if (error) {
      // user may loss internet connection that's why I show toast
      console.log(17, "CRITICAL:", error.message)
    }
  }

  async getProducts(): Promise<TRecordCartProduct> {
    const cartDB_response = await supabaseClient.from("23_users_cart").select("cart_products").single()
    const cartDB = cartDB_response.data?.cart_products as unknown as TRecordCartProduct
    return cartDB
  }
}
