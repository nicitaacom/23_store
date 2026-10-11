import type { TStorageProviderName } from "@/ts/storage"

export const UPLOAD_SIGNATURE_SECONDS = 300
export const R2_UPLOAD_PREFIX = "temp-uploads/"
// Retain existing upload sessions and cleanup inventories through the prefix rename.
export const R2_UPLOAD_PREFIXES = [R2_UPLOAD_PREFIX, "uploads/"] as const
export const SUPABASE_STAGING_BUCKET = "23_upload-staging"
export const SUPABASE_STAGING_MAX_BYTES = 50 * 1024 ** 2

export function activeStorageProvider(): TStorageProviderName {
  const provider = process.env.STORAGE_PROVIDER ?? "supabase"
  if (provider !== "supabase" && provider !== "r2") throw new Error("STORAGE_PROVIDER must be supabase or r2")
  return provider
}

export function fileChangesPaused(): boolean {
  return process.env.STORAGE_MIGRATION_PAUSED === "true"
}

export function r2Credentials() {
  const accountId = process.env.R2_ACCOUNT_ID
  const accessKeyId = process.env.R2_ACCESS_KEY_ID
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY
  const bucket = process.env.R2_BUCKET
  if (!accountId || !/^[a-f0-9]{32}$/i.test(accountId) || !accessKeyId || !secretAccessKey || !bucket)
    throw new Error("Configure R2 account, credentials and public application bucket")
  return { accountId, accessKeyId, secretAccessKey, bucket }
}
