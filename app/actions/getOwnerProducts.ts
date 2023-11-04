import supabaseServer from "@/libs/supabaseServer"

const getOnwerProducts = async () => {
  const { data: sessionData, error: sessionError } = await supabaseServer().auth.getSession()

  if (sessionError || !sessionData.session?.user.id) {
    console.log(sessionError?.message)
    return []
  }

  const { data } = await supabaseServer()
    .from("products")
    .select("*")
    .eq("owner_id", sessionData.session?.user?.id)

  return data
}

export default getOnwerProducts
