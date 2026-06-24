import { BaseSDK } from "@/sdk/BaseSDK"

export class AISDK extends BaseSDK {
  async prompt(prompt: string) {
    return this.postJson<API.AIRequest, API.AIResponse>(
      "/api/ai/",
      { prompt } satisfies API.AIRequest,
    )
  }

  async chatWithSalesAssistant(request: API.AISalesAssistantRequest) {
    return this.postJson<API.AISalesAssistantRequest, API.AISalesAssistantResponse>(
      "/api/ai/sales-assistant",
      request satisfies API.AISalesAssistantRequest,
    )
  }

  async syncSalesAssistantMemory(request: API.AISalesAssistantMemoryRequest) {
    return this.postJson<API.AISalesAssistantMemoryRequest, API.AISalesAssistantMemoryResponse>(
      "/api/ai/sales-assistant/memory",
      request satisfies API.AISalesAssistantMemoryRequest,
    )
  }

  async suggestCategory(request: API.AISuggestCategoryRequest) {
    return this.postJson<API.AISuggestCategoryRequest, API.AISuggestCategoryResponse>(
      "/api/ai/suggest-category",
      request satisfies API.AISuggestCategoryRequest,
    )
  }

  async generateImageBuffer(prompt: string) {
    const response = await this.request("/api/ai/generate-image", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt,
      } satisfies API.GenerateImageRequest),
      cache: "no-store",
    })

    return {
      buffer: await response.arrayBuffer(),
      contentType: response.headers.get("Content-Type") || "image/png",
    }
  }
}

export const aiSDK = new AISDK()
