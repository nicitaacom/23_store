import { BaseSDK } from "../BaseSDK"
import type { TStorageObject, TStorageReference, TStorageUploadDestination, TStorageUploadRequest } from "@/ts/storage"

export class StorageSDK extends BaseSDK {
  async prepare(input: TStorageUploadRequest): Promise<TStorageUploadDestination> {
    const response = await this.postJson<API.StoragePrepareRequest, API.StoragePrepareResponse>("/api/storage/prepare", input satisfies API.StoragePrepareRequest)
    if ("error" in response) throw new Error(response.error)
    return response
  }

  async complete(uploadId: string) {
    const response = await this.postJson<API.StorageCompleteRequest, API.StorageCompleteResponse>("/api/storage/complete", { uploadId } satisfies API.StorageCompleteRequest)
    if ("error" in response) throw new Error(response.error)
    return response
  }

  async list(input: Omit<API.StorageListRequest, "cursor">): Promise<TStorageObject[]> {
    const objects: TStorageObject[] = []
    let cursor: string | undefined
    do {
      const selectFilesResp = await this.postJson<API.StorageListRequest, API.StorageListResponse>("/api/storage/list", { ...input, cursor } satisfies API.StorageListRequest)
      if ("error" in selectFilesResp) throw new Error(selectFilesResp.error)
      objects.push(...selectFilesResp.objects)
      cursor = selectFilesResp.cursor ?? undefined
    } while (cursor)
    return objects
  }

  async delete(reference: TStorageReference): Promise<void> {
    await this.postVoid<API.StorageDeleteRequest>("/api/storage/delete", { reference } satisfies API.StorageDeleteRequest)
  }

  async download(reference: TStorageReference): Promise<string> {
    const selectDownloadResp = await this.postJson<API.StorageDownloadRequest, API.StorageDownloadResponse>("/api/storage/download", { reference } satisfies API.StorageDownloadRequest)
    if ("error" in selectDownloadResp) throw new Error(selectDownloadResp.error)
    return selectDownloadResp.url
  }

  async usage() {
    const getJsonResp = await this.getJson<API.StorageUsageResponse>("/api/storage/usage")
    if ("error" in getJsonResp) throw new Error(getJsonResp.error)
    return getJsonResp
  }

  async transfer(destination: TStorageUploadDestination, file: Blob, onProgress?: (bytes: number) => void): Promise<void> {
    await new Promise<void>((resolve, reject) => {
      const request = new XMLHttpRequest()
      request.open(destination.method, destination.signedUrl)
      request.timeout = 240000
      for (const [name, value] of Object.entries(destination.headers)) request.setRequestHeader(name, value)
      request.upload.onprogress = event => onProgress?.(event.loaded)
      request.onerror = () => reject(new Error("File transfer failed; check your connection"))
      request.ontimeout = () => reject(new Error("File transfer timed out; prepare another upload"))
      request.onload = () => request.status >= 200 && request.status < 300 ? resolve() : reject(new Error(`File transfer failed (${request.status})`))
      if (destination.formField === null) request.send(file)
      else { const form = new FormData(); form.append(destination.formField, file); request.send(form) }
    })
  }

  async upload(input: TStorageUploadRequest, file: File, onProgress?: (bytes: number) => void) {
    const destination = await this.prepare(input)
    await this.transfer(destination, file, onProgress)
    return this.complete(destination.uploadId)
  }
}

export const storageSDK = new StorageSDK()
