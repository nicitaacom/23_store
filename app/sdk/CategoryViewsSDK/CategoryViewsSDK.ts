import { BaseSDK } from "@/sdk/BaseSDK"

export class CategoryViewsSDK extends BaseSDK {
  async selectDBCategoryViews() {
    return this.getJson<API.CategoryViewsSelectResponse>("/api/category-views/select")
  }

  async incrementDBCategoryView(request: API.CategoryViewsIncrementRequest) {
    return this.postJson<API.CategoryViewsIncrementRequest, API.CategoryViewsIncrementResponse>(
      "/api/category-views/increment",
      request satisfies API.CategoryViewsIncrementRequest,
    )
  }

  async syncDBCategoryViews(request: API.CategoryViewsSyncRequest) {
    return this.postJson<API.CategoryViewsSyncRequest, API.CategoryViewsSyncResponse>(
      "/api/category-views/sync",
      request satisfies API.CategoryViewsSyncRequest,
    )
  }
}

export const categoryViewsSDK = new CategoryViewsSDK()
