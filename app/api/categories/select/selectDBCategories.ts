import { TCategory } from "@/ts/categories/TCategory"
import supabaseServerAction from "@/libs/supabase/supabaseServerAction"

export async function selectDBCategories(): Promise<TCategory[] | string> {
  const supabase = await supabaseServerAction()
  const { data, error } = await supabase
    .from("23_categories")
    .select("id, name, parent_id")
    .order("parent_id", { ascending: true, nullsFirst: true })
    .order("name", { ascending: true })

  if (error) return error.message
  return (data ?? []) as TCategory[]
}
