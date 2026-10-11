import { NextRequest } from "next/server"
import { S3Client, HeadObjectCommand, ListObjectsV2Command } from "@aws-sdk/client-s3"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import type { TBuckets } from "@/ts/types/TBuckets"
import { GET } from "./route"
import { gunzipBufferClient, parseTar } from "@/api/backup/tarClient"
import { readStorageTarEntries } from "@/api/backup/storageFilesTar"
import { BackupSDK } from "@/sdk/BackupSDK/BackupSDK"

const mocks = vi.hoisted(() => ({ requireAdmin: vi.fn() }))
vi.mock("../requireAdmin", () => ({ requireAdmin: mocks.requireAdmin }))
vi.mock("@/libs/supabase/supabaseAdmin", () => ({ default: {} }))
vi.mock("@/libs/supabase/supabaseRouteHandler", () => ({ supabaseRouteHandler: vi.fn() }))
vi.mock("@/libs/stripe", () => ({ stripe: {} }))
vi.mock("@/libs/storage/uploads", () => ({ prepareBackupStorageUploads: vi.fn() }))

const files: { bucket: TBuckets; path: string; contentType: string; bytes: Uint8Array }[] = [
  { bucket: "23_product-images", path: "owner/product/photo.png", contentType: "image/png", bytes: new Uint8Array([1, 2, 3]) },
  { bucket: "23_product-images", path: `owner/product/${"長".repeat(100)}.avif`, contentType: "image/avif", bytes: new Uint8Array([4, 5]) },
  { bucket: "23_ai-product-images", path: "owner/product/image.webp", contentType: "image/webp", bytes: new Uint8Array([6]) },
  { bucket: "23_avatar-images", path: "owner/avatar.jpeg", contentType: "image/jpeg", bytes: new Uint8Array([7, 8]) },
  { bucket: "23_support-images", path: "owner/ticket/image.png", contentType: "image/png", bytes: new Uint8Array([9]) },
  { bucket: "23_support-guest-images", path: "visitor/ticket/image.png", contentType: "image/png", bytes: new Uint8Array([10, 11]) },
  { bucket: "23_product-personalization-images", path: "buyer/product/фото.png", contentType: "image/png", bytes: new Uint8Array([12]) },
]

beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_PRODUCTION_URL", "https://shop.example")
  vi.stubEnv("NEXT_PUBLIC_R2_PUBLIC_URL", "https://files.example")
  vi.stubEnv("STORAGE_PROVIDER", "supabase")
  vi.stubEnv("R2_ACCOUNT_ID", "a".repeat(32))
  vi.stubEnv("R2_ACCESS_KEY_ID", "fixture-key")
  vi.stubEnv("R2_SECRET_ACCESS_KEY", "fixture-secret")
  vi.stubEnv("R2_BUCKET", "fixture-public")
  mocks.requireAdmin.mockResolvedValue(null)
})
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.unstubAllEnvs(); vi.clearAllMocks() })

describe("R2 Files export through the API and browser SDK", () => {
  it.each([
    { label: "all six categories with pagination and folder markers", inventory: files },
    { label: "product and avatar files before the other prefixes exist", inventory: [files[0], files[3]] },
    { label: "a new bucket with no category prefixes", inventory: [] },
  ])("exports $label without creating folders or changing the active provider", async ({ inventory }) => {
    const send = vi.spyOn(S3Client.prototype, "send").mockImplementation(async command => {
      if (command instanceof ListObjectsV2Command) {
        expect(command.input.Bucket).toBe("fixture-public")
        const matching = inventory.filter(file => `${file.bucket}/${file.path}`.startsWith(command.input.Prefix!))
        const page = command.input.ContinuationToken ? matching.slice(1) : matching.slice(0, 1)
        return { Contents: matching.length ? [{ Key: command.input.Prefix, Size: 0 },
          ...page.map(file => ({ Key: `${file.bucket}/${file.path}`, Size: 999 }))] : undefined,
        IsTruncated: !command.input.ContinuationToken && matching.length > 1,
        NextContinuationToken: !command.input.ContinuationToken && matching.length > 1 ? "second-page" : undefined }
      }
      if (command instanceof HeadObjectCommand) {
        const file = inventory.find(file => `${file.bucket}/${file.path}` === command.input.Key)
        if (!file) throw new Error("Unexpected file inspection")
        return { ContentLength: file.bytes.length, ContentType: file.contentType }
      }
      throw new Error("Export must only list and inspect files")
    })
    const downloadUrls: string[] = []
    const requests: URL[] = []
    vi.stubGlobal("fetch", vi.fn().mockImplementation(async (input: string) => {
      const url = new URL(input)
      if (url.origin === "https://shop.example" && url.pathname === "/api/backup/files") {
        expect(url.searchParams.get("provider")).toBe("r2")
        requests.push(url)
        return GET(new NextRequest(url))
      }
      const file = inventory.find(file => input === `https://files.example/${file.bucket}/${file.path.split("/").map(encodeURIComponent).join("/")}`)
      if (!file) throw new Error(`Unexpected download: ${input}`)
      downloadUrls.push(input)
      return new Response(new Uint8Array(file.bytes))
    }))
    const progress = vi.fn()
    const exportFilesResp = await new BackupSDK().exportFiles(progress, "r2")
    const tarEntries = parseTar(Buffer.from(await gunzipBufferClient(new Uint8Array(await exportFilesResp.exportFile.arrayBuffer()))))
    const restored = readStorageTarEntries(tarEntries)
    expect(restored.map(file => ({ bucket: file.bucket, path: file.path, contentType: file.contentType, bytes: new Uint8Array(file.bytes) }))).toEqual(inventory)
    expect(exportFilesResp.fileName).toMatch(/^23_backup-files-\d{4}-\d{2}-\d{2}\.tar\.gz$/)
    expect(exportFilesResp.exportFile.type).toBe("application/gzip")
    expect(downloadUrls).toHaveLength(inventory.length)
    expect(requests.map(url => Number(url.searchParams.get("bucketIndex")))).toEqual(inventory.length === files.length ? [0, 0, 1, 2, 3, 4, 5] : [0, 1, 2, 3, 4, 5])
    expect(send.mock.calls.filter(([command]) => command instanceof ListObjectsV2Command).map(([command]) => (command as ListObjectsV2Command).input.Prefix))
      .toEqual(inventory.length === files.length ? ["23_product-images/", "23_product-images/", "23_ai-product-images/", "23_avatar-images/", "23_support-images/", "23_support-guest-images/", "23_product-personalization-images/"]
        : ["23_product-images/", "23_ai-product-images/", "23_avatar-images/", "23_support-images/", "23_support-guest-images/", "23_product-personalization-images/"])
    const bytesTotal = inventory.reduce((sum, file) => sum + file.bytes.length, 0)
    expect(progress).toHaveBeenLastCalledWith(expect.objectContaining({ bytesDone: bytesTotal, bytesTotal }))
    expect(process.env.STORAGE_PROVIDER).toBe("supabase")
  })

  it.each(["Unauthorized", "Forbidden: admin only"])("rejects %s before listing storage", async error => {
    mocks.requireAdmin.mockResolvedValue(error)
    const send = vi.spyOn(S3Client.prototype, "send")
    const response = await GET(new NextRequest("https://shop.example/api/backup/files?provider=r2"))
    expect(response.status).toBe(error === "Unauthorized" ? 401 : 403)
    expect(send).not.toHaveBeenCalled()
  })
})
