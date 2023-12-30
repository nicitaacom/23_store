import { TRecordCartProduct } from "@/interfaces/TRecordCartProduct"
import { Json } from "@/interfaces/types_db"
import supabaseClient from "@/libs/supabaseClient"
import useUserStore from "@/store/user/userStore"
import { Storage } from "./Storage"

export class DBStorage extends Storage {
  async saveProducts(cartProducts: TRecordCartProduct): Promise<void> {
    const { userId } = useUserStore.getState()
    await supabaseClient
      .from("users_cart")
      .update({ cart_products: cartProducts as unknown as Json })
      .eq("id", userId)
    //TODO - if error make product.quantity color - danger
    //or its better to use localstorage and even if issues with DB let user to make transaction
  }
  async getProducts(): Promise<TRecordCartProduct> {
    const cartDB_response = await supabaseClient.from("users_cart").select("cart_products").single()
    const cartDB = cartDB_response.data?.cart_products as unknown as TRecordCartProduct
    return cartDB
  }
}
