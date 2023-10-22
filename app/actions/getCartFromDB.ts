"use server"

import { ICartProduct } from "@/interfaces/ICartProduct"
import supabaseServer from "@/utils/supabaseServer"
import supabaseServerAction from "@/utils/supabaseServerAction"

export default async function getCartFromDB() {
  const { data: user } = await supabaseServer().auth.getUser()
  if (user?.user?.id) {
    const { data: cart_products, error } = await supabaseServerAction()
      .from("users_cart")
      .select("cart_products")
      .single()
    console.log(14, "cart_products - ", cart_products)
    if (error) throw error
    return cart_products?.cart_products as unknown as Record<string, ICartProduct>
  }
  return {}
}
