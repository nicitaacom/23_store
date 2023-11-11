import supabaseServer from "@/libs/supabaseServer"

const getOwnerProducts = async () => {
  const { data: sessionData, error: sessionError } = await supabaseServer().auth.getSession()

  if (sessionError) throw new Error("getOwnerProducts_error - ", sessionError)
  if (!sessionData.session?.user.id) {
    return []
  }

  const { data } = await supabaseServer()
    .from("products")
    .select("*")
    .eq("owner_id", sessionData.session?.user?.id)
    .order("price", { ascending: true })

  return data
}

export default getOwnerProducts
