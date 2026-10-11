import { File } from "node:buffer"
import { afterEach, describe, expect, it, vi } from "vitest"

import { BackupSDK, type TBackupFilesProgress } from "./BackupSDK"
import { buildStorageTar, readStorageTarEntries } from "@/api/backup/storageFilesTar"
import { gunzipBufferClient, parseTar } from "@/api/backup/tarClient"
import { gzipBufferClient } from "@/api/backup/tarClient"
import { storageSDK } from "@/sdk/StorageSDK/StorageSDK"

const requestMocks = vi.hoisted(() => ({ getJson: vi.fn(), postJson: vi.fn() }))
const relinkResult: API.BackupStorageRelinkResult = { rowsUpdated: 1, urlsUpdated: 2, authUsersUpdated: 1,
  unresolvedReferences: 0, unresolvedPaths: 0, tables: [] }

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
  it("imports into R2 and relinks live database URLs to R2 even when the old server says it is inactive", async () => {
    const sdk = new BackupSDK()
    const path = "owner/product/image.png"
    const bytes = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])
    const gzipped = await gzipBufferClient(buildStorageTar([{ bucket: "23_product-images", path, contentType: "image/png", bytes }]))
    const destination = { bucket: "23_product-images", path, uploadId: "upload-r2", method: "PUT", headers: {},
      signedUrl: "https://staging.example/upload", formField: null, expiresAt: "2099-01-01",
      reference: { provider: "r2", bucket: "23_product-images", path } }
    requestMocks.postJson.mockResolvedValueOnce({ results: [destination], relinkRequired: false })
      .mockResolvedValue({ results: [{ uploadId: destination.uploadId, reference: destination.reference, publicUrl: "https://files.example/file" }] })
    vi.spyOn(storageSDK, "transfer").mockResolvedValue()
    vi.spyOn(storageSDK, "complete").mockResolvedValue({ reference: { provider: "r2", bucket: "23_product-images", path }, publicUrl: "https://files.example/file" })
    const relink = vi.spyOn(sdk, "relinkStorageUrls").mockResolvedValue(relinkResult)
    const response = await sdk.importFiles(new File([gzipped], "files.tar.gz") as unknown as globalThis.File, vi.fn(), "r2")
    expect(requestMocks.postJson).toHaveBeenCalledWith("/api/backup/files", {
      provider: "r2", files: [{ bucket: "23_product-images", filename: path, size: bytes.length, contentType: "image/png" }],
    })
    expect(storageSDK.transfer).toHaveBeenCalledWith(destination, expect.any(Blob), expect.any(Function))
    expect(storageSDK.complete).not.toHaveBeenCalled()
    expect(requestMocks.postJson).toHaveBeenCalledWith("/api/backup/files/complete", { uploadIds: ["upload-r2"] }, expect.objectContaining({ signal: expect.any(AbortSignal) }))
    expect(response).toEqual({ buckets: [{ bucket: "23_product-images", files: 1, failed: 0, skipped: 0 }], relink: relinkResult })
    expect(relink).toHaveBeenCalledWith("r2", expect.any(Function))
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
    requestMocks.postJson.mockResolvedValueOnce({
      results: [{ bucket: "23_product-images", path, signedUrl: "https://destination.example.com/upload", uploadId: "upload-1", method: "PUT", headers: {}, formField: "", expiresAt: "2099-01-01", reference: { provider: "supabase", bucket: "23_product-images", path } }],
    }).mockResolvedValue({ results: [{ uploadId: "upload-1", reference: { provider: "supabase", bucket: "23_product-images", path }, publicUrl: "https://destination.example.com/file" }] })
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
    expect(importFilesResp.buckets).toEqual([{ bucket: "23_product-images", files: 1, failed: 0, skipped: 0 }])
    expect(sdk.relinkStorageUrls).toHaveBeenCalledOnce()
  })

  it("bounds parallel uploads and completion requests and counts only actual transferred bytes", async () => {
    const sdk = new BackupSDK()
    vi.spyOn(sdk, "relinkStorageUrls").mockResolvedValue(relinkResult)
    const storedFiles = Array.from({ length: 20 }, (_, index) => ({ bucket: "23_product-images", path: `owner/file-${index}.png`, contentType: "image/png", bytes: Buffer.alloc(1000) }))
    const gzipped = await gzipBufferClient(buildStorageTar(storedFiles))
    const preparedSizes: number[] = []
    const completedSizes: number[] = []
    requestMocks.postJson.mockImplementation(async (path: string, body: API.BackupFilesPostRequest | API.BackupFilesCompleteRequest) => {
      if (path === "/api/backup/files" && "files" in body) {
        preparedSizes.push(body.files.length)
        return { relinkRequired: false, results: body.files.map(file => ({
          bucket: file.bucket, path: file.filename, uploadId: file.filename, method: "PUT", headers: {}, formField: null,
          signedUrl: "https://files.example/signed", expiresAt: "2099-01-01",
          reference: { provider: "r2", bucket: file.bucket, path: file.filename },
        })) }
      }
      if (path === "/api/backup/files/complete" && "uploadIds" in body) {
        expect(activeTransfers).toBe(0)
        completedSizes.push(body.uploadIds.length)
        return { results: body.uploadIds.map(uploadId => ({ uploadId, publicUrl: "https://files.example/final",
          reference: { provider: "r2", bucket: "23_product-images", path: uploadId } })) }
      }
      throw new Error(`Unexpected request ${path}`)
    })
    let activeTransfers = 0
    let maximumTransfers = 0
    vi.spyOn(storageSDK, "transfer").mockImplementation(async (destination, _file, onProgress) => {
      activeTransfers++
      maximumTransfers = Math.max(maximumTransfers, activeTransfers)
      onProgress?.(327)
      await new Promise(resolve => setTimeout(resolve, 5))
      activeTransfers--
      if (destination.uploadId === storedFiles[0].path) throw new Error("Connection interrupted")
      onProgress?.(1200) // Form overhead is excluded, and late lower progress events stay monotonic.
      onProgress?.(900)
    })
    const progress: TBackupFilesProgress[] = []
    const response = await sdk.importFiles(new File([gzipped], "files.tar.gz") as unknown as globalThis.File, update => progress.push(update), "r2")
    expect(maximumTransfers).toBe(8)
    expect(preparedSizes).toEqual([16, 4])
    expect(completedSizes).toEqual([4, 4, 4, 3, 4])
    expect(response.buckets).toEqual([{ bucket: "23_product-images", files: 19, failed: 1, skipped: 0 }])
    expect(progress.at(-1)?.bytesDone).toBe(19327)
    expect(progress.at(-1)?.bytesTotal).toBe(20000)
    expect(progress.every((update, index) => update.bytesDone <= update.bytesTotal && (!index || update.bytesDone >= progress[index - 1].bytesDone))).toBe(true)
  })

  it("retries the same completion ids after a lost response without transferring files twice", async () => {
    const sdk = new BackupSDK()
    vi.spyOn(sdk, "relinkStorageUrls").mockResolvedValue(relinkResult)
    const storedFile = { bucket: "23_avatar-images", path: "owner/avatar.png", bytes: Buffer.from([1]), contentType: "image/png" }
    const gzipped = await gzipBufferClient(buildStorageTar([storedFile]))
    const destination = { bucket: storedFile.bucket, path: storedFile.path, uploadId: "existing-upload", method: "PUT", headers: {}, formField: null,
      signedUrl: "https://files.example/signed", reference: { provider: "r2", bucket: storedFile.bucket, path: storedFile.path } }
    requestMocks.postJson.mockResolvedValueOnce({ results: [destination], relinkRequired: false })
      .mockRejectedValueOnce(new Error("Response lost"))
      .mockResolvedValue({ results: [{ uploadId: destination.uploadId, reference: destination.reference, publicUrl: "https://files.example/final" }] })
    const transfer = vi.spyOn(storageSDK, "transfer").mockResolvedValue()
    await sdk.importFiles(new File([gzipped], "files.tar.gz") as unknown as globalThis.File, vi.fn(), "r2")
    expect(transfer).toHaveBeenCalledOnce()
    const completionRequests = requestMocks.postJson.mock.calls.filter(call => call[0] === "/api/backup/files/complete")
    expect(completionRequests.map(call => call[1])).toEqual([{ uploadIds: [destination.uploadId] }, { uploadIds: [destination.uploadId] }])
  })

  it("relinks an entirely skipped backup without another upload or a false failure", async () => {
    const sdk = new BackupSDK()
    const files = [{ bucket: "23_avatar-images", path: "owner/avatar.png", bytes: Buffer.alloc(1000), contentType: "image/png" }]
    const gzipped = await gzipBufferClient(buildStorageTar(files))
    requestMocks.postJson.mockResolvedValue({ results: [{ bucket: files[0].bucket, path: files[0].path,
      skipped: true, reason: "already-exists", reference: { provider: "r2", bucket: files[0].bucket, path: files[0].path } }] })
    const transfer = vi.spyOn(storageSDK, "transfer")
    const relink = vi.spyOn(sdk, "relinkStorageUrls").mockResolvedValue(relinkResult)
    const progress = vi.fn()
    const response = await sdk.importFiles(new File([gzipped], "files.tar.gz") as unknown as globalThis.File, progress, "r2", { skipExisting: true })
    expect(requestMocks.postJson).toHaveBeenCalledOnce()
    expect(requestMocks.postJson).toHaveBeenCalledWith("/api/backup/files", expect.objectContaining({ provider: "r2", skipExisting: true }))
    expect(transfer).not.toHaveBeenCalled()
    expect(relink).toHaveBeenCalledWith("r2", expect.any(Function))
    expect(response.buckets).toEqual([{ bucket: "23_avatar-images", files: 0, failed: 0, skipped: 1 }])
    expect(progress).toHaveBeenLastCalledWith(expect.objectContaining({ bytesDone: 0, bytesTotal: 1000, bytesSkipped: 1000 }))
  })

  it("continues bounded relinking pages and retries a lost response with the same provider and step", async () => {
    const sdk = new BackupSDK()
    requestMocks.postJson.mockResolvedValueOnce({ ...relinkResult, sessionId: "session-id", step: 1, done: false, provider: "r2", label: "Checking R2 files…" })
      .mockRejectedValueOnce(new Error("Response lost"))
      .mockResolvedValueOnce({ ...relinkResult, sessionId: "session-id", step: 2, done: true, provider: "r2", label: "Image URL relinking finished" })
    const progress = vi.fn()
    expect(await sdk.relinkStorageUrls("r2", progress)).toEqual(relinkResult)
    expect(requestMocks.postJson.mock.calls.map(call => call.slice(0, 2))).toEqual([
      ["/api/backup/relink-storage-urls", { provider: "r2" }],
      ["/api/backup/relink-storage-urls", { provider: "r2", sessionId: "session-id", step: 1 }],
      ["/api/backup/relink-storage-urls", { provider: "r2", sessionId: "session-id", step: 1 }],
    ])
    expect(progress).toHaveBeenLastCalledWith("Image URL relinking finished")
  })
})
