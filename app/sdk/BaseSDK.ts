import { getResponseErrorMessage } from "@/utils/getResponseErrorMessage"
import { getURL } from "@/utils/helpers"

type TSearchParams = Record<string, string | number | boolean | null | undefined>

type TJSONRequestOptions = Omit<RequestInit, "body" | "method"> & {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE"
}

export class BaseSDK {
  protected getApiUrl(path: string, searchParams?: TSearchParams) {
    const normalizedPath = path.startsWith("/") ? path : `/${path}`
    const url =
      typeof window === "undefined" ? new URL(normalizedPath.replace(/^\//, ""), getURL()).toString() : normalizedPath

    if (!searchParams) return url

    const urlObject = typeof window === "undefined" ? new URL(url) : new URL(url, window.location.origin)

    for (const [key, value] of Object.entries(searchParams)) {
      if (value === undefined || value === null || value === "") continue
      urlObject.searchParams.set(key, String(value))
    }

    return typeof window === "undefined" ? urlObject.toString() : `${urlObject.pathname}${urlObject.search}`
  }

  protected async request(path: string, init: RequestInit = {}, searchParams?: TSearchParams) {
    const response = await fetch(this.getApiUrl(path, searchParams), {
      cache: "no-store",
      ...init,
    })

    if (!response.ok) {
      throw new Error(await getResponseErrorMessage(response))
    }

    return response
  }

  protected async getJson<ResponseType>(path: string, searchParams?: TSearchParams, init: RequestInit = {}) {
    const response = await this.request(path, { method: "GET", ...init }, searchParams)
    return (await response.json()) as ResponseType
  }

  protected async postJson<RequestType, ResponseType>(
    path: string,
    body: RequestType,
    init: TJSONRequestOptions = {},
    searchParams?: TSearchParams,
  ) {
    const response = await this.request(
      path,
      {
        method: init.method || "POST",
        ...init,
        headers: {
          "Content-Type": "application/json",
          ...(init.headers || {}),
        },
        body: JSON.stringify(body),
      },
      searchParams,
    )

    return (await response.json()) as ResponseType
  }

  protected async postText<RequestType>(
    path: string,
    body: RequestType,
    init: TJSONRequestOptions = {},
    searchParams?: TSearchParams,
  ) {
    const response = await this.request(
      path,
      {
        method: init.method || "POST",
        ...init,
        headers: {
          "Content-Type": "application/json",
          ...(init.headers || {}),
        },
        body: JSON.stringify(body),
      },
      searchParams,
    )

    return response.text()
  }

  protected async postFormData(path: string, formData: FormData, init: RequestInit = {}, searchParams?: TSearchParams) {
    return this.request(
      path,
      {
        method: "POST",
        ...init,
        body: formData,
      },
      searchParams,
    )
  }

  protected async postVoid<RequestType>(path: string, body: RequestType, init: TJSONRequestOptions = {}, searchParams?: TSearchParams) {
    await this.postJson<RequestType, unknown>(path, body, init, searchParams)
  }
}
