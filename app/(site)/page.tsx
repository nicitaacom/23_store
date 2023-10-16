import ProductsClient from "./components/ProductsClient"
import { Products } from "./components"
import supabaseClient from "@/utils/supabaseClient"

export default async function Home() {
  const { data: user } = await supabaseClient.auth.getUser()
  const products = await supabaseClient.from("products").select("*").limit(10)

  return (
    <div className="text-2xl text-white flex flex-col gap-y-8 justify-between items-center py-12">
      <section className="flex flex-col gap-y-4">
        {user.user?.id ? <Products products={products} /> : <ProductsClient products={products} />}
      </section>
    </div>
  )
}
