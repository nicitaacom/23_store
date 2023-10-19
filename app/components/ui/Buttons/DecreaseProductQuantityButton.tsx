"use client"

import { useRouter } from "next/navigation"

import { IProduct } from "@/interfaces/IProduct"
import useAnonymousCartStore from "@/store/user/anonymousCart"
import useUserStore from "@/store/user/userStore"
import getCartFromDB from "@/actions/getCart"
import supabaseClient from "@/utils/supabaseClient"
import { Button } from ".."

export default function DecreaseProductQuantityButton({ product }: { product: IProduct }) {
  const router = useRouter()

  const userStore = useUserStore()
  const anonymousCart = useAnonymousCartStore()

  async function decreaseProductQuantity(product: IProduct) {
    if (userStore.isAuthenticated) {
      /* logic to update cart_products in DB */
      const DB_cart = await getCartFromDB()
      let updatedProducts = DB_cart
      const productInDBCartIndex = updatedProducts.findIndex(productInCart => productInCart.id === product.id)
      updatedProducts[productInDBCartIndex].quantity === 0
        ? updatedProducts[productInDBCartIndex].quantity
        : (updatedProducts[productInDBCartIndex].quantity -= 1)
      //keep product in array only if updatedProduct.quantity > 0
      updatedProducts = updatedProducts.filter(updatedProduct => updatedProduct.quantity > 0)

      /* logic to update cart_quantity in DB */
      const { data: cart_quantity } = await supabaseClient
        .from("users_cart")
        .select("cart_quantity")
        .eq("id", userStore.userId)
        .single()

      if (cart_quantity?.cart_quantity !== null && cart_quantity?.cart_quantity !== undefined) {
        const updatedCartQuantity = cart_quantity.cart_quantity === 0 ? 0 : cart_quantity.cart_quantity - 1

        /* update cart_products and cart_quantity in DB */
        const { error: users_cart_error } = await supabaseClient
          .from("users_cart")
          .update({ cart_products: updatedProducts })
          .eq("id", userStore.userId)
        if (users_cart_error) throw users_cart_error
        const { error: cart_quantity_error } = await supabaseClient
          .from("users_cart")
          .update({ cart_quantity: updatedCartQuantity })
          .eq("id", userStore.userId)
        if (cart_quantity_error) throw cart_quantity_error
        router.refresh()
      }
    } else {
      anonymousCart.decreaseProductQuantity(product)
    }
  }
  return (
    <Button
      className="min-w-[50px] max-h-[50px] laptop:w-fit text-2xl"
      variant="danger-outline"
      onClick={async () => await decreaseProductQuantity(product)}>
      -
    </Button>
  )
}
