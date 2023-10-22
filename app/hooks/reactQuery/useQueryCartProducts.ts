import supabaseClient from "@/utils/supabaseClient"
import { User } from "@supabase/supabase-js"
import { useQuery } from "@tanstack/react-query"

const useQueryCartProducts = (user: User | null) => {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["cart_products"],
    queryFn: async () => {
      if (user) {
        const cart_products = await supabaseClient.from("users_cart").select("cart_products").single()
        if (cart_products.error) throw cart_products.error
        return cart_products.data?.cart_products
      }
      return null
    },
  })

  return { data, isLoading, isError }
}

export default useQueryCartProducts
