import { cache, lazy } from "react"
import { notFound } from "next/navigation"

import supabaseServer from "@/libs/supabase/supabaseServer"
import { Product } from "./components"
import PaginationControls from "@/components/PaginationControls"

interface SearchProps {
  searchParams: { [key: string]: string | string[] | undefined }
}

const fetchProducts = cache(async () => {
  const products = await supabaseServer().from("products").select("*").order("price", { ascending: true })
  if (!products) notFound()
  return products
})

export default async function Home({ searchParams }: SearchProps) {
  //Fetching all data from DB
  const products_response = await fetchProducts()
  if (products_response.error) throw products_response.error
  const products = products_response.data

  //Logic for pagination
  const page = Number(searchParams["page"]) || 1
  const perPage = Number(searchParams["perPage"]) || 5

  const totalItems = products.length
  const totalPages = Math.ceil(totalItems / perPage)

  const start = (page - 1) * perPage
  const end = Math.min(start + perPage, totalItems)

  const entries = products.slice(start, end)
  const ProductsPerPage = lazy(() => import("@/components/ProductsPerPage"))

  return (
    <div
      className="w-full py-12 h-[calc(100vh-64px)] overflow-x-hidden overflow-y-auto
       text-2xl text-title flex flex-col gap-y-8 justify-between items-center mx-auto">
      <section className="flex flex-col gap-y-4">
        <div
          className="mobile:border-[1px] broder-border-color rounded 
    w-full max-w-[1440px] min-w-[80vw]">
          <div className="flex flex-row justify-between px-4">
            <h1 className="hidden tablet:flex text-lg">Products:</h1>
          </div>
          <ul className="flex flex-col gap-y-8">
            {entries?.map(product => <Product {...product} key={product.id} />)}
          </ul>
        </div>
      </section>
      <div className="flex flex-col-reverse tablet:flex-row gap-4 justify-between items-center">
        <PaginationControls
          hasNextPage={end < totalItems}
          hasPrevPage={start > 0}
          currentPage={page}
          totalPages={totalPages}
          perPage={perPage}
        />
        <ProductsPerPage />
      </div>
    </div>
  )
}
