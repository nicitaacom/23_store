// DO NOT import anything here

declare namespace API {
  type CategoryViewsSelectResponse = { views: { category_id: string; view_count: number; last_viewed_at: string }[] } | { error: string }

  type CategoryViewsIncrementRequest = { category_id: string; delta?: number }
  type CategoryViewsIncrementResponse = { ok: boolean } | { error: string }

  type CategoryViewsSyncRequest = { views: Record<string, number> }
  type CategoryViewsSyncResponse = { ok: boolean } | { error: string }

  type AISuggestCategoryRequest = { title: string }
  type AISuggestCategoryResponse = { category_id: string | null } | { error: string }
}
