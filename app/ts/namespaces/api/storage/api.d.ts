// DO NOT import anything here
declare namespace API {
  type StoragePrepareRequest = import("@/ts/storage").TStorageUploadRequest
  type StoragePrepareResponse = import("@/ts/storage").TStorageUploadDestination | { error: string }
  type StorageCompleteRequest = { uploadId: string }
  type StorageCompleteResponse = { reference: import("@/ts/storage").TStorageReference; publicUrl: string } | { error: string }
  type StorageListRequest = { bucket: import("@/ts/types/TBuckets").TBuckets; entityId?: string; cursor?: string }
  type StorageListResponse = import("@/ts/storage").TStoragePage | { error: string }
  type StorageDeleteRequest = { reference: import("@/ts/storage").TStorageReference }
  type StorageDownloadRequest = StorageDeleteRequest
  type StorageDownloadResponse = { url: string } | { error: string }
  type StorageUsageResponse = import("@/ts/storage").TStorageUsage | { error: string }
}
