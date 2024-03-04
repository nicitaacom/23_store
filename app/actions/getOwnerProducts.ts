import supabaseServer from "@/libs/supabase/supabaseServer"
import { getUser } from "./getUser"

const getOwnerProducts = async () => {
  const user = await getUser()

  if (!user?.id) {
    return []
  }

  const { data } = await supabaseServer()
    .from("products")
    .select("*")
    .eq("owner_id", user.id)
    .order("price", { ascending: true })

  return data
}

export default getOwnerProducts
