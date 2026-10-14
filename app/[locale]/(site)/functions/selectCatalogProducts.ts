import supabaseServer from "@/libs/supabase/supabaseServer"

const RETRY_DELAYS_MS = [250, 750]
const TEMPORARY_FAILURE_STATUSES = [0, 502, 503, 504, 520]

export async function selectCatalogProducts(categoryIds?: string[]) {
  const supabase = await supabaseServer()

  for (let attempt = 0; ; attempt += 1) {
    let query = supabase.from("23_products").select("*").order("price", { ascending: true })
    if (categoryIds?.length) query = query.in("category_id", categoryIds)

    const selectProductsResp = await query
    if (
      !selectProductsResp.error ||
      !TEMPORARY_FAILURE_STATUSES.includes(selectProductsResp.status) ||
      attempt >= RETRY_DELAYS_MS.length
    ) {
      return selectProductsResp
    }

    await new Promise(resolve => setTimeout(resolve, RETRY_DELAYS_MS[attempt]))
  }
}
