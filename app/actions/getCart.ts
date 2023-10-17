"use server"

import { ICartProduct } from "@/interfaces/ICartProduct"
import { IProduct } from "@/interfaces/IProduct"
import supabaseServer from "@/utils/supabaseServer"
import supabaseServerAction from "@/utils/supabaseServerAction"

export default async function getCartFromDB() {
  const { data: user } = await supabaseServer().auth.getUser()
  if (user?.user?.id) {
    const { data: cart_products, error } = await supabaseServerAction()
      .from("users_cart")
      .select("cart_products")
      .eq("id", user?.user?.id)
      .single()
    if (error) throw error
    return cart_products?.cart_products as unknown as ICartProduct[]
  }
  return []
}
