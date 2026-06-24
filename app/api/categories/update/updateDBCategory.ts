import supabaseServerAction from "@/libs/supabase/supabaseServerAction"
import { TCategory } from "@/ts/categories/TCategory"

export async function updateDBCategory(
  id: string,
  name?: string,
  parent_id?: string | null,
): Promise<TCategory | string> {
  const supabase = await supabaseServerAction()
  const patch: Record<string, unknown> = {}
  if (name !== undefined) patch.name = name.trim()
  if (parent_id !== undefined) patch.parent_id = parent_id

  const { data, error } = await supabase
    .from("23_categories")
    .update(patch)
    .eq("id", id)
    .select("id, name, parent_id")
    .single()

  if (error) return error.message
  return data as TCategory
}
