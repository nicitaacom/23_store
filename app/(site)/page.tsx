import supabaseServer from "@/utils/supabaseServer"
import { Products } from "./components"
import PaginationControls from "@/components/PaginationControls"

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
  const per_page = Number(searchParams["per_page"]) || 5

  const totalItems = products.length
  const totalPages = Math.ceil(totalItems / per_page)

  const start = (page - 1) * per_page
  const end = Math.min(start + per_page, totalItems)

  const entries = products.slice(start, end)

  return (
    <div className="max-w-[1024px] text-2xl text-white flex flex-col gap-y-8 justify-between items-center py-12 mx-auto">
      <section className="flex flex-col gap-y-4">
        <Products products={entries} />
      </section>
      <PaginationControls
        hasNextPage={end < totalItems}
        hasPrevPage={start > 0}
        currentPage={page}
        totalPages={totalPages}
        perPage={per_page}
      />
    </div>
  )
}
