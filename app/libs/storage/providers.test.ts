import { S3Client, CopyObjectCommand, DeleteObjectCommand, GetObjectCommand, HeadObjectCommand, ListObjectsV2Command } from "@aws-sdk/client-s3"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { R2StorageProvider, SupabaseStorageProvider } from "./providers"
import { SUPABASE_STAGING_BUCKET, SUPABASE_STAGING_MAX_BYTES } from "./config"

const mocks = vi.hoisted(() => ({ list: vi.fn(), remove: vi.fn(), createSignedUploadUrl: vi.fn(), createBucket: vi.fn() }))
vi.mock("@/libs/supabase/supabaseAdmin", () => ({ default: { storage: { from: () => mocks, createBucket: mocks.createBucket } } }))

beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_R2_PUBLIC_URL", "https://files.example")
  vi.stubEnv("R2_ACCOUNT_ID", "a".repeat(32)); vi.stubEnv("R2_ACCESS_KEY_ID", "fixture-key"); vi.stubEnv("R2_SECRET_ACCESS_KEY", "fixture-secret")
  vi.stubEnv("R2_BUCKET", "fixture-public")
  vi.clearAllMocks()
})
afterEach(() => { vi.unstubAllEnvs(); vi.restoreAllMocks() })

describe("R2 provider", () => {
  it("requires only one public bucket and signs exact size, MIME and immutable temporary keys", async () => {
    const upload = await new R2StorageProvider().signUpload("temp-uploads/id/file.png", "image/png", 8)
    const url = new URL(upload.signedUrl)
    expect(url.pathname).toBe("/fixture-public/temp-uploads/id/file.png")
    expect(url.searchParams.get("X-Amz-SignedHeaders")?.split(";")).toEqual(expect.arrayContaining(["content-length", "content-type", "if-none-match"]))
    expect(upload.headers).toEqual({ "Content-Type": "image/png", "If-None-Match": "*" })
    expect(upload.formField).toBeNull()
  })
  it("preserves logical prefixes and continuation tokens", async () => {
    const send = vi.spyOn(S3Client.prototype, "send").mockImplementation(async () => ({ Contents: [{ Key: "23_avatar-images/owner/a.png", Size: 8 }], IsTruncated: true, NextContinuationToken: "page-2" }))
    const page = await new R2StorageProvider().list("23_avatar-images", "owner", "page-1")
    expect(page.objects[0].path).toBe("owner/a.png"); expect(page.cursor).toBe("page-2")
    expect(send.mock.calls[0][0]).toBeInstanceOf(ListObjectsV2Command)
    expect((send.mock.calls[0][0] as ListObjectsV2Command).input).toMatchObject({ Prefix: "23_avatar-images/owner/", ContinuationToken: "page-1" })
  })
  it("counts the single bucket once across pages, including temporary and unfamiliar keys", async () => {
    const send = vi.spyOn(S3Client.prototype, "send")
      .mockImplementationOnce(async () => ({ Contents: [{ Key: "unfamiliar-prefix/file", Size: 100 }], IsTruncated: true, NextContinuationToken: "page-2" }))
      .mockImplementation(async () => ({ Contents: [{ Key: "temp-uploads/id/file.png", Size: 8 }] }))
    expect(await new R2StorageProvider().measureBytes()).toBe(108)
    expect(send).toHaveBeenCalledTimes(2)
    expect((send.mock.calls[0][0] as ListObjectsV2Command).input).toEqual({ Bucket: "fixture-public", ContinuationToken: undefined, MaxKeys: 1000 })
    expect((send.mock.calls[1][0] as ListObjectsV2Command).input.ContinuationToken).toBe("page-2")
    send.mockImplementation(async () => ({ Contents: [{ Key: "file" }] }))
    await expect(new R2StorageProvider().measureBytes()).rejects.toThrow("unknown")
  })
  it("copies verified files within the same public bucket while preserving final paths", async () => {
    const send = vi.spyOn(S3Client.prototype, "send").mockImplementation(async () => ({ ContentLength: 8, ContentType: "image/png", ETag: "immutable" }))
    await new R2StorageProvider().publish({ actor: "owner", reference: { provider: "r2", bucket: "23_avatar-images", path: "owner/a.png" },
      stagePath: "temp-uploads/id/a.png", size: 8, contentType: "image/png", upsert: true, expiresAt: new Date().toISOString() })
    const command = send.mock.calls.map(call => call[0]).find(command => command instanceof CopyObjectCommand) as CopyObjectCommand
    expect(command.input).toMatchObject({ Bucket: "fixture-public", Key: "23_avatar-images/owner/a.png",
      CopySource: "fixture-public/temp-uploads/id/a.png", CopySourceIfMatch: "immutable" })
  })
  it("limits temporary cleanup inventory to the upload prefix and preserves final files", async () => {
    const send = vi.spyOn(S3Client.prototype, "send").mockImplementation(async () => ({ Contents: [
      { Key: "temp-uploads/id/a.png", Size: 8 }, { Key: "uploads/previous/a.png", Size: 8 }, { Key: "23_avatar-images/owner/a.png", Size: 8 },
    ] }))
    const provider = new R2StorageProvider()
    const page = await provider.listStaging()
    expect(page.objects.map(object => object.path)).toEqual(["temp-uploads/id/a.png"])
    expect((send.mock.calls[0][0] as ListObjectsV2Command).input).toMatchObject({ Bucket: "fixture-public", Prefix: "temp-uploads/" })
    const legacy = await provider.listStaging(page.cursor)
    expect(legacy.objects.map(object => object.path)).toEqual(["uploads/previous/a.png"])
    expect(legacy.cursor).toBeNull()
    expect((send.mock.calls[1][0] as ListObjectsV2Command).input.Prefix).toBe("uploads/")
    await provider.inspect("23_avatar-images", "uploads/previous/a.png", true)
    await provider.listStaging("previous-raw-cursor")
    expect((send.mock.calls.at(-1)![0] as ListObjectsV2Command).input).toMatchObject({ Prefix: "uploads/", ContinuationToken: "previous-raw-cursor" })
  })
  it("inspects, samples and deletes temporary keys in the public bucket and rejects final-key signing", async () => {
    const send = vi.spyOn(S3Client.prototype, "send").mockImplementation(async () => ({
      ContentLength: 8, ContentType: "image/png", ETag: "immutable", Body: { transformToByteArray: async () => new Uint8Array([137, 80]) },
    }))
    const provider = new R2StorageProvider()
    await provider.inspect("23_avatar-images", "temp-uploads/id/a.png", true)
    await provider.readSample("23_avatar-images", "temp-uploads/id/a.png", true)
    await provider.delete("23_avatar-images", "temp-uploads/id/a.png", true)
    expect(send.mock.calls.map(call => call[0].constructor)).toEqual([HeadObjectCommand, GetObjectCommand, DeleteObjectCommand])
    for (const call of send.mock.calls)
      expect((call[0] as HeadObjectCommand).input).toMatchObject({ Bucket: "fixture-public", Key: "temp-uploads/id/a.png" })
    await expect(provider.signUpload("23_avatar-images/owner/a.png", "image/png", 8)).rejects.toThrow("Invalid temporary upload path")
    await expect(provider.delete("23_avatar-images", "23_avatar-images/owner/a.png", true)).rejects.toThrow("Invalid temporary upload path")
  })
  it("reads a missing object as absent when head returns the storage 404 sentence", async () => {
    vi.spyOn(S3Client.prototype, "send").mockRejectedValue(Object.assign(new Error("The related resource does not exist"), {
      name: "NotFound", $metadata: { httpStatusCode: 400 },
    }))
    await expect(new R2StorageProvider().inspect("23_avatar-images", "temp-uploads/id/a.png", true)).resolves.toBeNull()
  })
})

describe("Supabase provider", () => {
  it("walks nested folders, preserving exact MIME, sizes and names", async () => {
    mocks.list.mockImplementation(async (folder: string) => ({ data: folder
      ? [{ id: "file", name: "long 文件.png", metadata: { size: 8, mimetype: "image/png" }, updated_at: "2026-10-11T12:00:00Z" }]
      : [{ id: null, name: "owner" }], error: null }))
    const page = await new SupabaseStorageProvider().list("23_avatar-images")
    expect(page.objects[0]).toMatchObject({ path: "owner/long 文件.png", size: 8, contentType: "image/png" })
    expect(page.cursor).toBeNull()
  })
  it("signs private staging and deletes bytes through the provider API", async () => {
    mocks.createSignedUploadUrl.mockResolvedValue({ data: { signedUrl: "https://private.example/signed" }, error: null })
    const provider = new SupabaseStorageProvider()
    expect((await provider.signUpload("temp-uploads/id/a.png", "image/png", 8)).formField).toBe("")
    expect(mocks.createSignedUploadUrl).toHaveBeenCalledWith("temp-uploads/id/a.png")
    mocks.remove.mockResolvedValue({ error: null })
    await provider.delete("23_avatar-images", "owner/a.png")
    expect(mocks.remove).toHaveBeenCalledWith(["owner/a.png"])
  })
  it("treats missing object sizes as unknown capacity instead of zero", async () => {
    mocks.list.mockResolvedValue({ data: [{ id: "file", name: "a.png", metadata: {} }], error: null })
    await expect(new SupabaseStorageProvider().measureBytes()).rejects.toThrow("unknown")
  })
  it("creates the private upload bucket when signing reports it missing", async () => {
    mocks.createSignedUploadUrl
      .mockResolvedValueOnce({ data: null, error: { message: "The related resource does not exist" } })
      .mockResolvedValueOnce({ data: { signedUrl: "https://private.example/signed" }, error: null })
    mocks.createBucket.mockResolvedValue({ data: { name: "bucket" }, error: null })
    expect((await new SupabaseStorageProvider().signUpload("temp-uploads/id/a.png", "image/png", 8)).formField).toBe("")
    expect(mocks.createBucket).toHaveBeenCalledWith(SUPABASE_STAGING_BUCKET, { public: false, fileSizeLimit: SUPABASE_STAGING_MAX_BYTES })
    expect(mocks.createSignedUploadUrl).toHaveBeenCalledTimes(2)
  })
  it("counts a missing bucket as zero bytes and still returns a total", async () => {
    let calls = 0
    mocks.list.mockImplementation(async () => {
      calls += 1
      if (calls === 1) return { data: null, error: { message: "The related resource does not exist" } }
      return { data: [], error: null }
    })
    mocks.createBucket.mockResolvedValue({ data: { name: "bucket" }, error: null })
    await expect(new SupabaseStorageProvider().measureBytes()).resolves.toBe(0)
  })
})
