import supabaseServer from "@/libs/supabase/supabaseServer"
import { normalizeProducts } from "@/utils/productVariants"
import { getUser } from "./getUser"

const getOwnerProducts = async () => {
  const user = await getUser()

  if (!user?.id) {
    return []
  }

  const { data } = await supabaseServer()
    .from("23_products")
    .select("*")
    .eq("owner_id", user.id)
    .order("price", { ascending: true })

  return normalizeProducts(data ?? [])
}

export default getOwnerProducts
