import { getUser } from "./getUser"
import supabaseServer from "@/libs/supabase/supabaseServer"
import { normalizeProducts } from "@/utils/productVariants"

const getOwnerProducts = async () => {
  const user = await getUser()

  if (!user?.id) {
    return []
  }

  const supabase = await supabaseServer()
  const { data } = await supabase
    .from("23_products")
    .select("*")
    .eq("owner_id", user.id)
    .order("price", { ascending: true })

  return normalizeProducts(data ?? [])
}

export default getOwnerProducts
