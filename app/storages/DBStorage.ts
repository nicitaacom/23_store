import { TRecordCartProduct } from "@/interfaces/TRecordCartProduct"
import { Storage } from "./Storage"
import supabaseClient from "@/utils/supabaseClient"
import { Json } from "@/interfaces/types_db"
import useUserStore from "@/store/user/userStore"

export class DBStorage extends Storage {
  async saveProducts(cartProducts: TRecordCartProduct): Promise<void> {
    const { userId } = useUserStore.getState()
    await supabaseClient
      .from("users_cart")
      .update({ cart_products: cartProducts as unknown as Json })
      .eq("id", userId)
    //TODO - if error make product.quantity color - danger
  }
  async getProducts(): Promise<TRecordCartProduct> {
    const cartDB_response = await supabaseClient.from("users_cart").select("cart_products").single()
    const cartDB = cartDB_response.data?.cart_products as unknown as TRecordCartProduct
    return cartDB
  }
}
