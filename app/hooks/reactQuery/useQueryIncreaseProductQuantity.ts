import { ICartProduct } from "@/interfaces/ICartProduct"
import useUserStore from "@/store/user/userStore"
import supabaseClient from "@/utils/supabaseClient"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { Dispatch, SetStateAction } from "react"

const useQueryIncreaseProductQuantity = (
  product: ICartProduct,
  productQuantity: number,
  setProductQuantity: Dispatch<SetStateAction<number>>,
) => {
  const queryClient = useQueryClient()
  const userStore = useUserStore()

  //Decrease product quantity
  const { mutate, isPending } = useMutation({
    mutationFn: async () => {
      const updated_cart_quantity: number | undefined = queryClient.getQueryData(["cart_quantity"])
      const updated_cart_products: ICartProduct[] | undefined = queryClient.getQueryData(["cart_products"])

      /* update cart_products and cart_quantity in DB */

      const { error: cart_quantity_error } = await supabaseClient
        .from("users_cart")
        .update({ cart_quantity: updated_cart_quantity })
        .eq("id", userStore.userId)
      if (cart_quantity_error) throw cart_quantity_error

      const { error: cart_products_error } = await supabaseClient
        .from("users_cart")
        .update({ cart_products: updated_cart_products })
        .eq("id", userStore.userId)
      if (cart_products_error) throw cart_products_error
    },
    onMutate: () => {
      /* logic to update cart_quantity optimistically */
      //update cart_quantity first
      const cart_quantity: number | undefined = queryClient.getQueryData(["cart_quantity"])
      let updated_cart_quantity = cart_quantity
      if (cart_quantity === 0) {
        return cart_quantity
      } else if (updated_cart_quantity !== undefined) {
        updated_cart_quantity -= 1
      }

      /* logic to update cart_products optimistically */
      const cart_products: ICartProduct[] | undefined = queryClient.getQueryData(["cart_products"])
      let updated_cart_products = cart_products
      if (productQuantity === 0) {
        return productQuantity
      } else if (updated_cart_products !== undefined) {
        updated_cart_products[
          updated_cart_products?.findIndex(productInCart => productInCart.id === product.id)
        ].quantity -= 1
        //leave products in cart only if product.quantity > 0
        updated_cart_products = updated_cart_products.filter(productInCart => productInCart.quantity > 0)
        setProductQuantity(productQuantity - 1)
      }

      queryClient.setQueryData(["cart_quantity"], updated_cart_quantity)
      queryClient.setQueryData(["cart_products"], updated_cart_products)
    },
    onError: () => {
      /* logic to rollback cart_quantity */
      //update cart_quantity first
      const cart_quantity: number | undefined = queryClient.getQueryData(["cart_quantity"])
      let updated_cart_quantity = cart_quantity
      if (updated_cart_quantity === 0) {
        return cart_quantity
      } else if (updated_cart_quantity !== undefined) {
        updated_cart_quantity += 1
      }

      /* logic to rollback cart_products */
      const cart_products: ICartProduct[] | undefined = queryClient.getQueryData(["cart_products"])
      let updated_cart_products = cart_products
      if (productQuantity === 0) {
        return productQuantity
      } else if (updated_cart_products !== undefined && productQuantity + 1 === 1) {
        //no way to rollback this because I setProductQuantity(1-1)
      } else if (updated_cart_products !== undefined) {
        updated_cart_products[
          updated_cart_products.findIndex(productInCart => (productInCart.id = product.id))
        ].quantity += 1
        setProductQuantity(productQuantity + 1)
      }

      queryClient.setQueryData(["cart_quantity"], updated_cart_quantity)
      queryClient.setQueryData(["cart_products"], updated_cart_products)
    },
  })

  return { mutate, isPending }
}

export default useQueryIncreaseProductQuantity
