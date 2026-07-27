import { BaseSDK } from "@/sdk/BaseSDK"

type TInsertDBDesignRequest = API.PersonalizedDesignsCreateRequest & { user_id: string }

export class PersonalizedDesignsSDK extends BaseSDK {
  async insertDBDesign(request: TInsertDBDesignRequest) {
    return this.postJson<TInsertDBDesignRequest, API.PersonalizedDesignsCreateResponse>(
      "/api/personalized-designs",
      request satisfies TInsertDBDesignRequest,
    )
  }

  async updateDBDesignsToOrdered(request: API.PersonalizedDesignsMarkOrderedRequest) {
    return this.postJson<API.PersonalizedDesignsMarkOrderedRequest, API.PersonalizedDesignsMarkOrderedResponse>(
      "/api/personalized-designs",
      request satisfies API.PersonalizedDesignsMarkOrderedRequest,
      { method: "PATCH" },
    )
  }
}

export const personalizedDesignsSDK = new PersonalizedDesignsSDK()
