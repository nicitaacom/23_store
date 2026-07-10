import { getUser } from "./getUser"
import { normalizeProducts } from "@/utils/productVariants"
import supabaseServer from "@/libs/supabase/supabaseServer"

async function getOwnerProducts() {
  const getUserResp = await getUser()

  if (!getUserResp?.id) {
    return []
  }

  const supabase = await supabaseServer()
  const { data } = await supabase
    .from("23_products")
    .select("*")
    .eq("owner_id", getUserResp.id)
    .order("price", { ascending: true })

  return normalizeProducts(data ?? [])
}

export default getOwnerProducts
