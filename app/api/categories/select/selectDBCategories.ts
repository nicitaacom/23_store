import { TCategory } from "@/ts/categories/TCategory"
import { selectPublicCatalogCategories } from "@/libs/publicCatalog"

export async function selectDBCategories(): Promise<TCategory[] | string> {
  const { data, error } = await selectPublicCatalogCategories()

  if (error) return error.message
  return data ?? []
}
