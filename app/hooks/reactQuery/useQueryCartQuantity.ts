import supabaseClient from "@/utils/supabaseClient"
import { User } from "@supabase/supabase-js"
import { useQuery } from "@tanstack/react-query"

const useQueryCartQuantity = (user: User | null) => {
  // fetch cart quantity here to get queryData in future without request to DB when increase/decrease product quantity
  const { data, isLoading, isError } = useQuery({
    queryKey: ["cart_quantity"],
    queryFn: async () => {
      if (user) {
        const cart_quantity = await supabaseClient.from("users_cart").select("cart_quantity").eq("id", user.id).single()
        if (cart_quantity.error) throw cart_quantity.error
        return cart_quantity.data?.cart_quantity
      }
      return null
    },
  })

  return { data, isLoading, isError }
}

export default useQueryCartQuantity
