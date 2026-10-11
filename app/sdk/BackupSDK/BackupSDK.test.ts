import { File } from "node:buffer"
import { afterEach, describe, expect, it, vi } from "vitest"

import { BackupSDK } from "./BackupSDK"
import { buildStorageTar, readStorageTarEntries } from "@/api/backup/storageFilesTar"
import { gunzipBufferClient, parseTar } from "@/api/backup/tarClient"
import { gzipBufferClient } from "@/api/backup/tarClient"
import { storageSDK } from "@/sdk/StorageSDK/StorageSDK"

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
  it("copies a backup to inactive R2 without changing live database URLs", async () => {
    const sdk = new BackupSDK()
    const path = "owner/product/image.png"
    const bytes = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])
    const gzipped = await gzipBufferClient(buildStorageTar([{ bucket: "23_product-images", path, contentType: "image/png", bytes }]))
    const destination = { bucket: "23_product-images", path, uploadId: "upload-r2", method: "PUT", headers: {},
      signedUrl: "https://staging.example/upload", formField: null, expiresAt: "2099-01-01",
      reference: { provider: "r2", bucket: "23_product-images", path } }
    requestMocks.postJson.mockResolvedValue({ results: [destination], relinkRequired: false })
    vi.spyOn(storageSDK, "transfer").mockResolvedValue()
    vi.spyOn(storageSDK, "complete").mockResolvedValue({ reference: { provider: "r2", bucket: "23_product-images", path }, publicUrl: "https://files.example/file" })
    const relink = vi.spyOn(sdk, "relinkStorageUrls")
    const response = await sdk.importFiles(new File([gzipped], "files.tar.gz") as unknown as globalThis.File, vi.fn(), "r2")
    expect(requestMocks.postJson).toHaveBeenCalledWith("/api/backup/files", {
      provider: "r2", files: [{ bucket: "23_product-images", filename: path, size: bytes.length, contentType: "image/png" }],
    })
    expect(storageSDK.transfer).toHaveBeenCalledWith(destination, expect.any(Blob), expect.any(Function))
    expect(storageSDK.complete).toHaveBeenCalledWith("upload-r2")
    expect(response).toEqual({ buckets: [{ bucket: "23_product-images", files: 1, failed: 0 }], relink: null })
    expect(relink).not.toHaveBeenCalled()
  })

  it("exports every selected-provider page using its download URLs", async () => {
    const sdk = new BackupSDK()
    requestMocks.getJson.mockResolvedValueOnce({
      files: [{ bucket: "23_avatar-images", path: "owner/a.png", size: 1, contentType: "image/png", downloadUrl: "https://files.example/a.png" }],
      cursor: "next-page", nextBucketIndex: 0,
    }).mockResolvedValueOnce({
      files: [{ bucket: "23_avatar-images", path: "owner/b.png", size: 1, contentType: "image/png", downloadUrl: "https://files.example/b.png" }],
      cursor: null, nextBucketIndex: null,
    })
    const download = vi.fn().mockImplementation(async () => new Response(new Uint8Array([1])))
    vi.stubGlobal("fetch", download)
    const exportFilesResp = await sdk.exportFiles(vi.fn(), "r2")
    expect(requestMocks.getJson).toHaveBeenNthCalledWith(1, "/api/backup/files", { bucketIndex: 0, cursor: null, provider: "r2" })
    expect(requestMocks.getJson).toHaveBeenNthCalledWith(2, "/api/backup/files", { bucketIndex: 0, cursor: "next-page", provider: "r2" })
    expect(download.mock.calls.map(call => call[0])).toEqual(["https://files.example/a.png", "https://files.example/b.png"])
    const entries = parseTar(Buffer.from(await gunzipBufferClient(new Uint8Array(await exportFilesResp.exportFile.arrayBuffer()))))
    expect(readStorageTarEntries(entries).map(file => file.path)).toEqual(["owner/a.png", "owner/b.png"])
  })

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
      results: [{ bucket: "23_product-images", path, signedUrl: "https://destination.example.com/upload", uploadId: "upload-1", method: "PUT", headers: {}, formField: "", expiresAt: "2099-01-01", reference: { provider: "supabase", bucket: "23_product-images", path } }],
    })
    vi.spyOn(storageSDK, "complete").mockResolvedValue({ reference: { provider: "supabase", bucket: "23_product-images", path }, publicUrl: "https://destination.example.com/file" })
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
    expect(requestMocks.postJson).toHaveBeenCalledWith("/api/backup/files", { files: [{ bucket: "23_product-images", filename: path, size: bytes.length, contentType: "image/avif" }] })
    expect(uploadedUrls).toEqual(["https://destination.example.com/upload"])
    const uploadedImage = uploadedForms[0].get("") as Blob
    expect(uploadedImage.type).toBe("image/avif")
    expect(new Uint8Array(await uploadedImage.arrayBuffer())).toEqual(bytes)
    expect(importFilesResp.buckets).toEqual([{ bucket: "23_product-images", files: 1, failed: 0 }])
    expect(sdk.relinkStorageUrls).toHaveBeenCalledOnce()
  })
})
