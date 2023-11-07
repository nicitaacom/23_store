"use server"

import { TRecordCartProduct } from "@/interfaces/TRecordCartProduct"
import supabaseServer from "@/libs/supabaseServer"
import supabaseServerAction from "@/libs/supabaseServerAction"

export default async function getCartFromDB() {
  const { data: user } = await supabaseServer().auth.getUser()
  if (user?.user?.id) {
    const { data: cart_products, error } = await supabaseServerAction()
      .from("users_cart")
      .select("cart_products")
      .single()
    if (error) throw error
    return cart_products?.cart_products as unknown as TRecordCartProduct
  }
  return {}
}
