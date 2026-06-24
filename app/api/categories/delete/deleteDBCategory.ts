import supabaseServerAction from "@/libs/supabase/supabaseServerAction"

export async function deleteDBCategory(id: string): Promise<true | string> {
  const supabase = await supabaseServerAction()
  const { error } = await supabase.from("23_categories").delete().eq("id", id)
  if (error) return error.message
  return true
}
