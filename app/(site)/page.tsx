import supabaseServer from "@/utils/supabaseServer"
import { Products } from "./components"
import supabaseClient from "@/utils/supabaseClient"

export default async function Home() {
  //TODO - fix error with supabase cookies (I need supabaseServer to getUser() from cookies)
  const { data: userResponse } = await supabaseClient.auth.getUser()
  const user = userResponse.user
  const products_response = await supabaseClient.from("products").select("*").limit(10)
  if (products_response.error) throw products_response.error
  const products = products_response.data
  console.log(12, "products - ", products)

  const cart_quantity_response = await supabaseServer().from("users_cart").select("cart_quantity").single()
  const cart_quantity = cart_quantity_response.data ?? undefined
  console.log(14, "cart_quantity - ", cart_quantity)

  const cart_products_response = await supabaseServer().from("users_cart").select("cart_products").single()
  const cart_products = (cart_products_response.data?.cart_products as number) ?? undefined
  console.log(19, "cart_products - ", cart_products)

  return (
    <div className="text-2xl text-white flex flex-col gap-y-8 justify-between items-center py-12">
      <section className="flex flex-col gap-y-4">
        <Products products={products} />
      </section>
    </div>
  )
}
