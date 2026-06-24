import supabaseServerAction from "@/libs/supabase/supabaseServerAction"
import { TCategory } from "@/ts/categories/TCategory"

export async function insertDBCategory(name: string, parent_id: string | null): Promise<TCategory | string> {
  const supabase = await supabaseServerAction()
  const { data, error } = await supabase
    .from("23_categories")
    .insert({ name: name.trim(), parent_id: parent_id ?? null })
    .select("id, name, parent_id")
    .single()

  if (error) return error.message
  return data as TCategory
}
