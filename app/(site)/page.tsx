import supabaseServer from "@/libs/supabaseServer"
import { Products } from "./components"
import PaginationControls from "@/components/PaginationControls"
import { ProductsPerPage } from "@/components/ProductsPerPage"

export default async function Home({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined }
}) {
  //Fetching all data from DB
  const products_response = await supabaseServer().from("products").select("*").order("price", { ascending: true })
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

  return (
    <div className="max-w-[1024px] text-2xl text-white flex flex-col gap-y-8 justify-between items-center py-12 min-h-[calc(100vh-4rem)] mx-auto">
      <section className="flex flex-col gap-y-4">
        <Products products={entries} />
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
