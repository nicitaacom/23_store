import type { TBuckets } from "./types/TBuckets"

export type TStorageProviderName = "supabase" | "r2"
export type TStorageReference = { provider: TStorageProviderName; bucket: TBuckets; path: string }
export type TStorageObject = TStorageReference & {
  size: number
  contentType: string
  updatedAt: string | null
  etag: string | null
}
export type TStoragePage = { objects: TStorageObject[]; cursor: string | null }
export type TStorageUploadRequest = {
  bucket: TBuckets
  filename: string
  contentType: string
  size: number
  entityId?: string
  folder?: string
  upsert?: boolean
}
export type TStorageUploadDestination = {
  uploadId: string
  signedUrl: string
  method: "PUT"
  headers: Record<string, string>
  formField: string | null
  expiresAt: string
  reference: TStorageReference
}
export type TStorageUploadSession = {
  actor: string
  reference: TStorageReference
  stagePath: string
  size: number
  contentType: string
  upsert: boolean
  expiresAt: string
  publicUrl?: string
  backup?: boolean
}
export interface IStorageProvider {
  name: TStorageProviderName
  list(bucket: TBuckets, prefix?: string, cursor?: string | null): Promise<TStoragePage>
  inspect(bucket: TBuckets, path: string, staging?: boolean): Promise<TStorageObject | null>
  signUpload(stagePath: string, contentType: string, size: number): Promise<Pick<TStorageUploadDestination, "signedUrl" | "headers" | "formField">>
  signDownload(bucket: TBuckets, path: string): Promise<string>
  readSample(bucket: TBuckets, path: string, staging?: boolean): Promise<Uint8Array>
  publish(session: TStorageUploadSession): Promise<void>
  delete(bucket: TBuckets, path: string, staging?: boolean): Promise<void>
  listStaging(cursor?: string | null): Promise<TStoragePage>
  publicUrl(bucket: TBuckets, path: string): string
  measureBytes(): Promise<number>
}
export type TStorageMetric = {
  value: number | null
  unit: "bytes" | "objects" | "requests"
  source: string
  scope: string
  observedAt: string | null
  status: "available" | "stale" | "unavailable"
  detail?: string
  allowance?: number | null
  remaining?: number | null
  excess?: number | null
  link?: string
}
export type TStorageUsage = {
  provider: TStorageProviderName
  refreshedAt: string
  metrics: Record<string, TStorageMetric>
}
export type TStorageUsageState = {
  usage: TStorageUsage | null
  localError: string | null
  setUsage: (usage: TStorageUsage) => void
  setLocalError: (error: string | null) => void
}
