import { ICartProduct } from "@/interfaces/ICartProduct"
import useUserStore from "@/store/user/userStore"
import supabaseClient from "@/utils/supabaseClient"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { Dispatch, SetStateAction } from "react"

const useQueryDecreaseProductQuantity = (
  product: ICartProduct,
  productQuantity: number,
  setProductQuantity: Dispatch<SetStateAction<number>>,
) => {
  const queryClient = useQueryClient()
  const userStore = useUserStore()

  //Increase product quantity
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
      //update cart quantity first
      const cart_quantity: number | undefined = queryClient.getQueryData(["cart_quantity"])
      let updated_cart_quantity = cart_quantity
      if (productQuantity === product.on_stock) {
        return updated_cart_quantity
      } else if (updated_cart_quantity !== undefined) {
        updated_cart_quantity += 1
      }

      /* logic to update cart_products optimistically */

      const cart_products: ICartProduct[] | undefined = queryClient.getQueryData(["cart_products"])
      const updated_cart_products = cart_products
      if (productQuantity === 0) {
        //Add product in updated_cart_products if product.quantity === 0 to set it in future
        updated_cart_products?.push({ ...product, quantity: 1 })
        setProductQuantity(product.quantity + 1)
      } else if (productQuantity === product.on_stock) {
        updated_cart_products
      } else if (updated_cart_products !== undefined) {
        updated_cart_products[
          updated_cart_products.findIndex(productInCart => productInCart.id === product.id)
        ].quantity += 1
        setProductQuantity(productQuantity + 1)
      }

      /* update cart_products and cart_quantity optimistically */

      queryClient.setQueryData(["cart_quantity"], updated_cart_quantity)
      queryClient.setQueryData(["cart_products"], updated_cart_products)
      console.log(92, [updated_cart_quantity, updated_cart_products])
      return updated_cart_quantity
    },
    onError: () => {
      //I have no access to context - so I do rollback manually

      /* logic to rollback cart_quantity  */
      //update cart quantity first
      const cart_quantity: number | undefined = queryClient.getQueryData(["cart_quantity"])
      let previous_cart_quantity = cart_quantity
      if (productQuantity === product.on_stock) {
        return previous_cart_quantity
      } else if (previous_cart_quantity !== undefined) {
        previous_cart_quantity -= 1
      }

      /* logic to rollback cart_products */

      const cart_products: ICartProduct[] | undefined = queryClient.getQueryData(["cart_products"])
      const previous_cart_products = cart_products
      if (productQuantity - 1 === 0) {
        //leave products in array that !== product.id
        previous_cart_products?.filter(productInCart => productInCart.id !== product.id)
      } else if (productQuantity === product.on_stock) {
        previous_cart_products
      } else if (previous_cart_products !== undefined) {
        previous_cart_products[
          previous_cart_products.findIndex(productInCart => productInCart.id === product.id)
        ].quantity -= 1
        setProductQuantity(productQuantity - 1)
      }

      /* rollback cart_products and cart_quantity */

      queryClient.setQueryData(["cart_quantity"], previous_cart_quantity)
      queryClient.setQueryData(["cart_products"], previous_cart_products)
    },
  })

  return { mutate, isPending }
}

export default useQueryDecreaseProductQuantity
