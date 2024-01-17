import { TRecordCartProduct } from "@/interfaces/TRecordCartProduct"
import { Json } from "@/interfaces/types_db"
import supabaseClient from "@/libs/supabaseClient"
import useUserStore from "@/store/user/userStore"
import { Storage } from "./Storage"
import useToast from "@/store/ui/useToast"

export class DBStorage extends Storage {
  async saveProducts(cartProducts: TRecordCartProduct): Promise<void> {
    console.log(10, "save cartProducts - ", cartProducts)
    const show = useToast.getState().show
    const { userId } = useUserStore.getState()
    const { error } = await supabaseClient
      .from("users_cart")
      .update({ cart_products: cartProducts as unknown as Json })
      .eq("id", userId)
    if (error) {
      // user may loss internet connection that's why I show toast
      if (error instanceof Error) {
        show("error", "Error updating quantity", error.message)
      }
    }
  }
  async getProducts(): Promise<TRecordCartProduct> {
    const cartDB_response = await supabaseClient.from("users_cart").select("cart_products").single()
    const cartDB = cartDB_response.data?.cart_products as unknown as TRecordCartProduct
    return cartDB
  }
}
