// DO NOT import anything here

declare module API {
  type CategoriesSelectResponse = { categories: { id: string; name: string; parent_id: string | null }[] } | { error: string }

  type CategoriesInsertRequest = { name: string; parent_id?: string | null }
  type CategoriesInsertResponse = { category: { id: string; name: string; parent_id: string | null } } | { error: string }

  type CategoriesUpdateRequest = { id: string; name?: string; parent_id?: string | null }
  type CategoriesUpdateResponse = { category: { id: string; name: string; parent_id: string | null } } | { error: string }

  type CategoriesDeleteRequest = { id: string }
  type CategoriesDeleteResponse = { ok: boolean } | { error: string }

  type CategoriesCountRequest = { id: string }
  type CategoriesCountResponse = { count: number } | { error: string }
}
