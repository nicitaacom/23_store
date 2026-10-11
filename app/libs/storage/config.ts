import type { TBuckets } from "@/ts/types/TBuckets"
import { isStorageBucket } from "./references"
import type { TStorageProviderName } from "@/ts/storage"

export const UPLOAD_SIGNATURE_SECONDS = 300
export const SUPABASE_STAGING_BUCKET = "23_upload-staging"
export const SUPABASE_STAGING_MAX_BYTES = 50 * 1024 ** 2

export function activeStorageProvider(): TStorageProviderName {
  const provider = process.env.STORAGE_PROVIDER ?? "supabase"
  if (provider !== "supabase" && provider !== "r2") throw new Error("STORAGE_PROVIDER must be supabase or r2")
  return provider
}

export function privateStorageBuckets(): TBuckets[] {
  const buckets = (process.env.STORAGE_PRIVATE_LOGICAL_BUCKETS ?? "").split(",").map(bucket => bucket.trim()).filter(Boolean)
  if (buckets.some(bucket => !isStorageBucket(bucket))) throw new Error("Invalid STORAGE_PRIVATE_LOGICAL_BUCKETS")
  return buckets as TBuckets[]
}

export function fileChangesPaused(): boolean {
  return process.env.STORAGE_MIGRATION_PAUSED === "true"
}

export function r2Credentials() {
  const accountId = process.env.R2_ACCOUNT_ID
  const accessKeyId = process.env.R2_ACCESS_KEY_ID
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY
  const bucket = process.env.R2_BUCKET
  const stagingBucket = process.env.R2_STAGING_BUCKET
  const privateBucket = process.env.R2_PRIVATE_BUCKET
  if (!accountId || !/^[a-f0-9]{32}$/i.test(accountId) || !accessKeyId || !secretAccessKey || !bucket || !stagingBucket)
    throw new Error("Configure R2 account, credentials, application bucket and private staging bucket")
  if (new Set([bucket, stagingBucket, ...(privateBucket ? [privateBucket] : [])]).size !== (privateBucket ? 3 : 2))
    throw new Error("R2 public, private and staging buckets must be separate")
  if (privateStorageBuckets().length && !privateBucket) throw new Error("Configure R2_PRIVATE_BUCKET for private file categories")
  return { accountId, accessKeyId, secretAccessKey, bucket, stagingBucket, privateBucket }
}
