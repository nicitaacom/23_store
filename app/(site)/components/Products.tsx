import { ProductsSkeleton } from "@/components/Skeletons"
import supabaseServer from "@/utils/supabaseServer"
import { cache } from "react"

//get products from cache (check in future if product was edited - do new request to DB)
//if no products in cache - fetch from DB
const fetchProducts = cache(async () => {
  const products = await supabaseServer().from("products").select("*")
  console.log(9, "products - ", products)
  if (!products.data) return <div>No products found</div>
  return products.data
})

export default async function Products() {
  const products = await fetchProducts()
  //set individual quantity for each user in updatedProducts variable
  return (
    <div
      className="mobile:border-[1px] broder-border-color rounded 
    w-full max-w-[1440px] min-w-[80vw]">
      <div className="flex flex-row justify-between px-4">
        <h1 className="hidden tablet:flex text-lg">Products:</h1>
      </div>
      <ul className="flex flex-col gap-y-8"></ul>
    </div>
  )
}
