import { NextRequest, NextResponse } from "next/server"

import { requireAdmin } from "../requireAdmin"
import { activeStorageProvider } from "@/libs/storage/config"
import { checkStorageOrigin, storageFailure, StorageRequestError, verifyStorageActor } from "@/libs/storage/authorization"
import { prepareBackupStorageUploads } from "@/libs/storage/uploads"
import { storageProvider } from "@/libs/storage/providers"
import { BACKUP_FILE_BATCH_SIZE } from "@/constants/backupTransfer"
import { STORAGE_BUCKETS } from "@/libs/storage/references"
import type { TStorageProviderName } from "@/ts/storage"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 60

function selectedProvider(provider: unknown): TStorageProviderName {
  if (provider == null) return activeStorageProvider()
  if (provider !== "supabase" && provider !== "r2") throw new StorageRequestError("Invalid storage provider")
  return provider
}

// Metadata and provider URLs only. Each request covers one bounded inventory page.
export async function GET(request: NextRequest) {
  const adminError = await requireAdmin()
  if (adminError) return NextResponse.json({ error: adminError }, { status: adminError === "Unauthorized" ? 401 : 403 })
  try {
    const bucketIndex = Number(request.nextUrl.searchParams.get("bucketIndex") ?? 0)
    const bucket = STORAGE_BUCKETS[bucketIndex]
    if (!Number.isInteger(bucketIndex) || !bucket) throw new StorageRequestError("Invalid bucket index")
    const provider = storageProvider(selectedProvider(request.nextUrl.searchParams.get("provider")))
    const page = await provider.list(bucket, "", request.nextUrl.searchParams.get("cursor"))
    const files: API.BackupFileRef[] = []
    for (let start = 0; start < page.objects.length; start += 10) {
      files.push(...await Promise.all(page.objects.slice(start, start + 10).map(async object => {
        const metadata = provider.name === "r2" ? await provider.inspect(bucket, object.path) : object
        if (!metadata) throw new Error(`Inventory changed during backup: ${bucket}/${object.path}`)
        return { ...metadata, downloadUrl: provider.publicUrl(bucket, object.path) }
      })))
    }
    return NextResponse.json({ files, cursor: page.cursor,
      nextBucketIndex: page.cursor ? bucketIndex : bucketIndex + 1 < STORAGE_BUCKETS.length ? bucketIndex + 1 : null,
    } satisfies API.BackupFilesGetResponse)
  } catch (error) { return storageFailure(error) }
}

// Restore authorization uses exact imported tar keys, sizes and MIME types after the ADMIN check.
export async function POST(request: NextRequest) {
  try {
    checkStorageOrigin(request)
    const actor = await verifyStorageActor(request)
    if (!actor.admin) throw new StorageRequestError("ADMIN role required", 403)
    const { files, provider } = await request.json() as API.BackupFilesPostRequest
    if (!Array.isArray(files) || files.length < 1 || files.length > BACKUP_FILE_BATCH_SIZE)
      throw new StorageRequestError(`Supply 1 to ${BACKUP_FILE_BATCH_SIZE} files per request`)
    const providerName = selectedProvider(provider)
    const destinations = await prepareBackupStorageUploads(actor, files, providerName)
    return NextResponse.json({
      results: destinations.map(destination => ({ bucket: destination.reference.bucket, path: destination.reference.path, ...destination })),
      relinkRequired: providerName === activeStorageProvider(),
    } satisfies API.BackupFilesPostResponse)
  } catch (error) { return storageFailure(error) }
}
