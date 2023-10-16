"use client"
import { ICartProduct } from "@/interfaces/ICartProduct"
import { Button } from ".."
import getCartFromDB from "@/actions/getCart"
import { IProduct } from "@/interfaces/IProduct"
import useAnonymousCartStore from "@/store/user/anonymousCart"
import useUserStore from "@/store/user/userStore"
import supabaseClient from "@/utils/supabaseClient"

export default function IncreaseProductQuantityButton({ product }: { product: IProduct }) {
  const userStore = useUserStore()
  const anonymousCart = useAnonymousCartStore()

  async function increaseProductQuantity(product: IProduct) {
    if (userStore.isAuthenticated) {
      /* logic to update cart_products in DB */
      const DB_cart = await getCartFromDB()
      const updatedProducts = DB_cart
      const productInDBCartIndex = updatedProducts.findIndex(productInCart => productInCart.id === product.id)
      if (productInDBCartIndex === -1) {
        //Add new product in DB_cart if it doesn't exist
        updatedProducts.push({ ...product, quantity: 1 })
      } else {
        // If product already exists - update the quantity
        updatedProducts[productInDBCartIndex].on_stock === updatedProducts[productInDBCartIndex].quantity
          ? updatedProducts[productInDBCartIndex].quantity
          : (updatedProducts[productInDBCartIndex].quantity += 1)
      }

      /* logic to update cart_quantity in DB */
      const { data: cart_quantity } = await supabaseClient
        .from("users_cart")
        .select("cart_quantity")
        .eq("id", userStore.userId)
        .single()
      if (cart_quantity?.cart_quantity) {
        const updatedCartQuantity =
          updatedProducts.findIndex(updatedProduct => updatedProduct.id === product.id) === -1
            ? cart_quantity.cart_quantity + 1
            : updatedProducts[updatedProducts.findIndex(updatedProduct => updatedProduct.id === product.id)]
                .quantity ===
              updatedProducts[updatedProducts.findIndex(updatedProduct => updatedProduct.id === product.id)].on_stock
            ? cart_quantity.cart_quantity
            : cart_quantity.cart_quantity + 1

        /* update cart_products and cart_quantity in DB */
        const { error: users_cart_error } = await supabaseClient
          .from("users_cart")
          .update({ cart_products: updatedProducts })
          .eq("id", userStore.userId)
        if (users_cart_error) throw users_cart_error
        const { error: cart_quantity_error } = await supabaseClient
          .from("users_cart")
          .update({ cart_quantity: updatedCartQuantity })
        if (cart_quantity_error) throw cart_quantity_error
      }
    } else {
      anonymousCart.increaseProductQuantity(product)
    }
  }

  return (
    <form action={async () => await increaseProductQuantity(product)}>
      <Button className="min-w-[50px] max-h-[50px] laptop:w-fit text-2xl" variant="success-outline">
        +
      </Button>
    </form>
  )
}
