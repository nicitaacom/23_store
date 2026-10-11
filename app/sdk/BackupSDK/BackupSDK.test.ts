import { File } from "node:buffer"
import { afterEach, describe, expect, it, vi } from "vitest"

import { BackupSDK } from "./BackupSDK"
import { gunzipBufferClient, parseTar } from "@/api/backup/tarClient"

const requestMocks = vi.hoisted(() => ({ getJson: vi.fn(), postJson: vi.fn() }))

vi.mock("../BaseSDK", () => ({
  BaseSDK: class {
    getJson = requestMocks.getJson
    postJson = requestMocks.postJson
  },
}))

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
  vi.clearAllMocks()
})

describe("BackupSDK Storage files", () => {
  it("exports extractable names and requests signed uploads for the original keys on import", async () => {
    const sdk = new BackupSDK()
    const path = `owner/product/${"aloe-vera-".repeat(35)}3.avif`
    const bytes = new Uint8Array([0, 1, 2, 255])
    const uploadedForms: FormData[] = []
    const uploadedUrls: string[] = []
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://source.example.com")
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(bytes)))
    requestMocks.getJson.mockResolvedValue({
      files: [{ bucket: "23_product-images", path, size: bytes.length, contentType: "image/avif" }],
    })
    requestMocks.postJson.mockResolvedValue({
      results: [{ bucket: "23_product-images", path, signedUrl: "https://destination.example.com/upload" }],
    })
    vi.spyOn(sdk, "relinkStorageUrls").mockResolvedValue({
      rowsUpdated: 0,
      urlsUpdated: 0,
      authUsersUpdated: 0,
      unresolvedReferences: 0,
      unresolvedPaths: 0,
      tables: [],
    })
    vi.stubGlobal(
      "XMLHttpRequest",
      class {
        upload = { onprogress: null }
        status = 200
        onload: (() => void) | null = null
        open(_method: string, url: string) {
          uploadedUrls.push(url)
        }
        setRequestHeader() {}
        send(formData: FormData) {
          uploadedForms.push(formData)
          this.onload?.()
        }
      },
    )

    const exportFilesResp = await sdk.exportFiles(vi.fn())
    const backupBytes = new Uint8Array(await exportFilesResp.exportFile.arrayBuffer())
    const entries = parseTar(Buffer.from(await gunzipBufferClient(backupBytes)))
    expect(entries.has("storage-files/file-000001.avif")).toBe(true)
    expect(entries.has(`storage/23_product-images/${path}`)).toBe(false)

    const importFilesResp = await sdk.importFiles(
      new File([backupBytes], exportFilesResp.fileName) as unknown as globalThis.File,
      vi.fn(),
    )
    expect(requestMocks.postJson).toHaveBeenCalledWith("/api/backup/files", { files: [{ bucket: "23_product-images", path }] })
    expect(uploadedUrls).toEqual(["https://destination.example.com/upload"])
    const uploadedImage = uploadedForms[0].get("") as Blob
    expect(uploadedImage.type).toBe("image/avif")
    expect(new Uint8Array(await uploadedImage.arrayBuffer())).toEqual(bytes)
    expect(importFilesResp.buckets).toEqual([{ bucket: "23_product-images", files: 1, failed: 0 }])
    expect(sdk.relinkStorageUrls).toHaveBeenCalledOnce()
  })
})
