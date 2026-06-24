import { BaseSDK } from "@/sdk/BaseSDK"

export class CategoriesSDK extends BaseSDK {
  async selectDBCategories() {
    return this.getJson<API.CategoriesSelectResponse>("/api/categories/select")
  }

  async insertDBCategory(request: API.CategoriesInsertRequest) {
    return this.postJson<API.CategoriesInsertRequest, API.CategoriesInsertResponse>(
      "/api/categories/insert",
      request satisfies API.CategoriesInsertRequest,
    )
  }

  async updateDBCategory(request: API.CategoriesUpdateRequest) {
    return this.postJson<API.CategoriesUpdateRequest, API.CategoriesUpdateResponse>(
      "/api/categories/update",
      request satisfies API.CategoriesUpdateRequest,
      { method: "PATCH" },
    )
  }

  async deleteDBCategory(request: API.CategoriesDeleteRequest) {
    return this.postJson<API.CategoriesDeleteRequest, API.CategoriesDeleteResponse>(
      "/api/categories/delete",
      request satisfies API.CategoriesDeleteRequest,
      { method: "DELETE" },
    )
  }

  async selectDBCategoryCount(id: string) {
    return this.getJson<API.CategoriesCountResponse>("/api/categories/count", { id })
  }
}

export const categoriesSDK = new CategoriesSDK()
