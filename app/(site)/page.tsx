import supabaseServer from "@/utils/supabaseServer"
import { Products } from "./components"
import supabaseClient from "@/utils/supabaseClient"

export default async function Home() {
  //TODO - fix error with supabase cookies (I need supabaseServer to getUser() from cookies)
  const { data: userResponse } = await supabaseServer().auth.getUser()
  const user = userResponse.user
  const products_response = await supabaseServer().from("products").select("*").limit(10)
  if (products_response.error) throw products_response.error
  const products = products_response.data

  return (
    <div className="max-w-[1024px] text-2xl text-white flex flex-col gap-y-8 justify-between items-center py-12 mx-auto">
      <section className="flex flex-col gap-y-4">
        <Products products={products} />
      </section>
    </div>
  )
}
