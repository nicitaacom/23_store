import {
  CopyObjectCommand, DeleteObjectCommand, GetObjectCommand, HeadObjectCommand,
  ListObjectsV2Command, PutObjectCommand, S3Client,
} from "@aws-sdk/client-s3"
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"

import type { TBuckets } from "@/ts/types/TBuckets"
import { isStoragePath, STORAGE_BUCKETS, storagePublicUrl } from "./references"
import { r2Credentials, R2_UPLOAD_PREFIX, SUPABASE_STAGING_BUCKET, UPLOAD_SIGNATURE_SECONDS } from "./config"
import supabaseAdmin from "@/libs/supabase/supabaseAdmin"
import type { IStorageProvider, TStorageObject, TStoragePage, TStorageProviderName, TStorageUploadSession } from "@/ts/storage"

const PAGE_SIZE = 100

async function requireResponse(response: Response): Promise<Response> {
  if (!response.ok) throw new Error(`Storage request failed (${response.status})`)
  return response
}

export class SupabaseStorageProvider implements IStorageProvider {
  name = "supabase" as const

  async list(bucket: TBuckets, prefix = "", cursor: string | null = null): Promise<TStoragePage> {
    return this.listBucket(bucket, prefix, cursor)
  }

  private async listBucket(bucket: string, prefix = "", cursor: string | null = null): Promise<TStoragePage> {
    const state: { folders: string[]; offset: number } = cursor
      ? JSON.parse(Buffer.from(cursor, "base64url").toString("utf8")) : { folders: [prefix], offset: 0 }
    if (!Array.isArray(state.folders) || !Number.isSafeInteger(state.offset) || state.offset < 0 ||
      state.folders.length > 10000 || state.folders.some(folder => typeof folder !== "string" ||
        (prefix && folder !== prefix && !folder.startsWith(`${prefix}/`)) || (folder && !isStoragePath(folder))))
      throw new Error("Invalid storage cursor")
    const objects: TStorageObject[] = []
    let pages = 0
    while (state.folders.length && objects.length < PAGE_SIZE && pages++ < 10) {
      const folder = state.folders[0]
      const { data: entries, error } = await supabaseAdmin.storage.from(bucket).list(folder, {
        limit: PAGE_SIZE, offset: state.offset, sortBy: { column: "name", order: "asc" },
      })
      if (error) throw new Error(error.message)
      for (const entry of entries ?? []) {
        const path = folder ? `${folder}/${entry.name}` : entry.name
        if (!entry.id) state.folders.push(path)
        else objects.push({
          provider: this.name, bucket: bucket as TBuckets, path, size: Number(entry.metadata?.size ?? NaN),
          contentType: entry.metadata?.mimetype ?? "application/octet-stream", updatedAt: entry.updated_at ?? null,
          etag: entry.metadata?.eTag ?? null,
        })
      }
      if ((entries?.length ?? 0) < PAGE_SIZE) { state.folders.shift(); state.offset = 0 }
      else state.offset += PAGE_SIZE
    }
    return { objects, cursor: state.folders.length ? Buffer.from(JSON.stringify(state)).toString("base64url") : null }
  }

  async inspect(bucket: TBuckets, path: string, staging = false): Promise<TStorageObject | null> {
    const storageBucket = staging ? SUPABASE_STAGING_BUCKET : bucket
    const folder = path.split("/").slice(0, -1).join("/")
    const name = path.slice(path.lastIndexOf("/") + 1)
    for (let offset = 0; ; offset += PAGE_SIZE) {
      const { data: entries, error } = await supabaseAdmin.storage.from(storageBucket).list(folder,
        { search: name, offset, limit: PAGE_SIZE, sortBy: { column: "name", order: "asc" } })
      if (error) throw new Error(error.message)
      const entry = entries?.find(entry => entry.name === name && entry.id)
      if (entry) return { provider: this.name, bucket, path, size: Number(entry.metadata?.size ?? NaN),
        contentType: entry.metadata?.mimetype ?? "application/octet-stream", updatedAt: entry.updated_at ?? null,
        etag: entry.metadata?.eTag ?? null }
      if ((entries?.length ?? 0) < PAGE_SIZE) return null
    }
  }

  async signUpload(stagePath: string, _contentType: string, _size: number) {
    const { data: upload, error } = await supabaseAdmin.storage.from(SUPABASE_STAGING_BUCKET).createSignedUploadUrl(stagePath)
    if (error || !upload) throw new Error(error?.message ?? "Upload signing failed")
    // eslint-disable-next-line local-rules/no-banned-words -- Required HTTP freshness header.
    return { signedUrl: upload.signedUrl, headers: { "cache-control": "max-age=0" }, formField: "" }
  }

  async signDownload(bucket: TBuckets, path: string): Promise<string> {
    return this.signBucketDownload(bucket, path)
  }

  private async signBucketDownload(bucket: string, path: string): Promise<string> {
    const { data: download, error } = await supabaseAdmin.storage.from(bucket).createSignedUrl(path, UPLOAD_SIGNATURE_SECONDS)
    if (error || !download) throw new Error(error?.message ?? "Download signing failed")
    return download.signedUrl
  }

  async readSample(bucket: TBuckets, path: string, staging = false): Promise<Uint8Array> {
    const url = await this.signBucketDownload(staging ? SUPABASE_STAGING_BUCKET : bucket, path)
    const response = await requireResponse(await fetch(url, { headers: { Range: "bytes=0-4095" }, cache: "no-store" }))
    // Cancel after the sample even when a provider ignores Range.
    const reader = response.body?.getReader()
    if (!reader) throw new Error("Storage returned no file content")
    const sample = new Uint8Array(4096)
    let length = 0
    try {
      while (length < sample.length) {
        const chunk = await reader.read()
        if (chunk.done) break
        const bytes = chunk.value.subarray(0, sample.length - length)
        sample.set(bytes, length)
        length += bytes.length
      }
      return sample.subarray(0, length)
    }
    finally { await reader.cancel() }
  }

  async publish(session: TStorageUploadSession): Promise<void> {
    // Provider-side copy keeps backup bytes outside Next.js, including overwrite operations.
    const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/copy`, {
      method: "POST", headers: {
        Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        apikey: process.env.SUPABASE_SERVICE_ROLE_KEY, "Content-Type": "application/json", "x-upsert": String(session.upsert),
      },
      body: JSON.stringify({ bucketId: SUPABASE_STAGING_BUCKET, sourceKey: session.stagePath,
        destinationBucket: session.reference.bucket, destinationKey: session.reference.path,
        // eslint-disable-next-line local-rules/no-banned-words -- Required provider freshness metadata.
        metadata: { cacheControl: "max-age=0, must-revalidate", mimetype: session.contentType } }),
      signal: AbortSignal.timeout(30000),
    })
    await requireResponse(response)
  }

  async delete(bucket: TBuckets, path: string, staging = false): Promise<void> {
    const { error } = await supabaseAdmin.storage.from(staging ? SUPABASE_STAGING_BUCKET : bucket).remove([path])
    if (error) throw new Error(error.message)
  }

  async listStaging(cursor: string | null = null) { return this.listBucket(SUPABASE_STAGING_BUCKET, "", cursor) }
  publicUrl(bucket: TBuckets, path: string) { return storagePublicUrl(this.name, bucket, path) }
  async measureBytes(): Promise<number> {
    let bytes = 0
    for (const bucket of [...STORAGE_BUCKETS, SUPABASE_STAGING_BUCKET]) {
      let cursor: string | null = null
      do {
        const page = await this.listBucket(bucket, "", cursor)
        for (const object of page.objects) bytes += verifiedByteCount(object.size)
        cursor = page.cursor
      } while (cursor)
    }
    return verifiedByteCount(bytes)
  }
}

export class R2StorageProvider implements IStorageProvider {
  name = "r2" as const
  private client: S3Client
  private config: ReturnType<typeof r2Credentials>

  constructor() {
    this.config = r2Credentials()
    storagePublicUrl(this.name, "23_avatar-images", "configuration-check")
    this.client = new S3Client({ region: "auto", forcePathStyle: true, endpoint: `https://${this.config.accountId}.r2.cloudflarestorage.com`,
      credentials: { accessKeyId: this.config.accessKeyId, secretAccessKey: this.config.secretAccessKey },
      requestChecksumCalculation: "WHEN_REQUIRED", responseChecksumValidation: "WHEN_REQUIRED",
      requestHandler: { connectionTimeout: 10000, requestTimeout: 30000 } })
  }

  private keyFor(bucket: TBuckets, path: string, staging = false) {
    if (staging && (!path.startsWith(R2_UPLOAD_PREFIX) || !isStoragePath(path)))
      throw new Error("Invalid temporary upload path")
    return staging ? path : `${bucket}/${path}`
  }

  async list(bucket: TBuckets, prefix = "", cursor: string | null = null): Promise<TStoragePage> {
    const response = await this.client.send(new ListObjectsV2Command({ Bucket: this.config.bucket,
      Prefix: `${bucket}/${prefix}${prefix && !prefix.endsWith("/") ? "/" : ""}`,
      ContinuationToken: cursor ?? undefined, MaxKeys: PAGE_SIZE }))
    return { objects: (response.Contents ?? []).filter(object => object.Key && !object.Key.endsWith("/")).map(object => ({
      provider: this.name, bucket, path: (object.Key as string).slice(bucket.length + 1), size: object.Size ?? 0,
      contentType: "application/octet-stream", updatedAt: object.LastModified?.toISOString() ?? null, etag: object.ETag ?? null,
    })), cursor: response.IsTruncated ? response.NextContinuationToken ?? null : null }
  }

  async inspect(bucket: TBuckets, path: string, staging = false): Promise<TStorageObject | null> {
    try {
      const response = await this.client.send(new HeadObjectCommand({ Bucket: this.config.bucket, Key: this.keyFor(bucket, path, staging) }))
      return { provider: this.name, bucket, path, size: response.ContentLength ?? 0,
        contentType: response.ContentType ?? "application/octet-stream", updatedAt: response.LastModified?.toISOString() ?? null,
        etag: response.ETag ?? null }
    } catch (error) {
      if (error && typeof error === "object" && "$metadata" in error &&
        (error.$metadata as { httpStatusCode?: number }).httpStatusCode === 404) return null
      throw error
    }
  }

  async signUpload(stagePath: string, contentType: string, size: number) {
    const getSignedUrlResp = await getSignedUrl(this.client, new PutObjectCommand({ Bucket: this.config.bucket,
      Key: this.keyFor("23_support-guest-images", stagePath, true),
    // eslint-disable-next-line local-rules/no-banned-words -- Required provider freshness metadata.
      ContentType: contentType, ContentLength: size, IfNoneMatch: "*", CacheControl: "no-store" }),
    { expiresIn: UPLOAD_SIGNATURE_SECONDS, signableHeaders: new Set(["content-type", "content-length", "if-none-match"]) })
    return { signedUrl: getSignedUrlResp, headers: { "Content-Type": contentType, "If-None-Match": "*" }, formField: null }
  }

  async signDownload(bucket: TBuckets, path: string) {
    return getSignedUrl(this.client, new GetObjectCommand({ Bucket: this.config.bucket, Key: this.keyFor(bucket, path) }),
      { expiresIn: UPLOAD_SIGNATURE_SECONDS })
  }

  async readSample(bucket: TBuckets, path: string, staging = false): Promise<Uint8Array> {
    const response = await this.client.send(new GetObjectCommand({ Bucket: this.config.bucket,
      Key: this.keyFor(bucket, path, staging), Range: "bytes=0-4095" }))
    return await response.Body?.transformToByteArray() ?? new Uint8Array()
  }

  async publish(session: TStorageUploadSession): Promise<void> {
    const { bucket, path } = session.reference
    const object = await this.inspect(bucket, session.stagePath, true)
    if (!object?.etag) throw new Error("Staged upload is missing")
    if (!session.upsert && await this.inspect(bucket, path)) throw new Error("File already exists; prepare a new filename")
    await this.client.send(new CopyObjectCommand({ Bucket: this.config.bucket, Key: this.keyFor(bucket, path),
      CopySource: `${this.config.bucket}/${session.stagePath.split("/").map(encodeURIComponent).join("/")}`,
      CopySourceIfMatch: object.etag, MetadataDirective: "REPLACE", ContentType: session.contentType,
      // eslint-disable-next-line local-rules/no-banned-words -- Required provider freshness metadata.
      CacheControl: "max-age=0, must-revalidate", Metadata: { upload: session.stagePath } }))
  }

  async delete(bucket: TBuckets, path: string, staging = false) {
    await this.client.send(new DeleteObjectCommand({ Bucket: this.config.bucket, Key: this.keyFor(bucket, path, staging) }))
  }

  async listStaging(cursor: string | null = null): Promise<TStoragePage> {
    const response = await this.client.send(new ListObjectsV2Command({ Bucket: this.config.bucket, Prefix: R2_UPLOAD_PREFIX,
      ContinuationToken: cursor ?? undefined, MaxKeys: PAGE_SIZE }))
    return { objects: (response.Contents ?? []).filter(object => object.Key?.startsWith(R2_UPLOAD_PREFIX)).map(object => ({ provider: this.name,
      bucket: "23_support-guest-images", path: object.Key ?? "", size: object.Size ?? 0,
      contentType: "application/octet-stream", updatedAt: object.LastModified?.toISOString() ?? null, etag: object.ETag ?? null })),
    cursor: response.IsTruncated ? response.NextContinuationToken ?? null : null }
  }
  publicUrl(bucket: TBuckets, path: string) { return storagePublicUrl(this.name, bucket, path) }
  async measureBytes(): Promise<number> {
    let bytes = 0
    let cursor: string | undefined
    do {
      const response = await this.client.send(new ListObjectsV2Command({ Bucket: this.config.bucket,
        ContinuationToken: cursor, MaxKeys: 1000 }))
      for (const object of response.Contents ?? []) bytes += verifiedByteCount(object.Size)
      if (response.IsTruncated && !response.NextContinuationToken) throw new Error("Incomplete R2 byte inventory")
      cursor = response.IsTruncated ? response.NextContinuationToken : undefined
    } while (cursor)
    return verifiedByteCount(bytes)
  }
}

function verifiedByteCount(bytes: number | undefined): number {
  if (!Number.isSafeInteger(bytes) || bytes === undefined || bytes < 0) throw new Error("Storage byte usage is unknown")
  return bytes
}

export function storageProvider(name: TStorageProviderName): IStorageProvider {
  return name === "r2" ? new R2StorageProvider() : new SupabaseStorageProvider()
}

export async function listStorageObjects(provider: IStorageProvider, bucket: TBuckets, prefix = ""): Promise<TStorageObject[]> {
  const objects: TStorageObject[] = []
  let cursor: string | null = null
  do {
    const page = await provider.list(bucket, prefix, cursor)
    objects.push(...page.objects)
    cursor = page.cursor
  } while (cursor)
  return objects
}
