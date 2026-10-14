import { randomUUID } from "node:crypto"

import { activeStorageProvider, fileChangesPaused, R2_UPLOAD_PREFIX, SUPABASE_STAGING_MAX_BYTES, UPLOAD_SIGNATURE_SECONDS } from "./config"
import { authorizedStorageFolder, StorageRequestError } from "./authorization"
import { cancelStorageCapacity, cancelStorageCapacityBatch, reserveStorageCapacity, reserveStorageCapacityBatch, settleStorageCapacity, settleStorageCapacityBatch } from "./capacity"
import { fileKey, releaseFileLock, storageRedis, uploadKey } from "./state"
import { isStorageBucket, isStoragePath } from "./references"
import { listStorageObjects, storageProvider } from "./providers"
import type { TStorageActor } from "./authorization"
import { BACKUP_COMPLETION_BATCH_SIZE, BACKUP_FILE_BATCH_SIZE, BACKUP_METADATA_CONCURRENCY } from "@/constants/backupTransfer"
import type { IStorageProvider, TBackupStorageUploadDestination, TStorageProviderName, TStorageReference, TStorageUploadDestination, TStorageUploadRequest, TStorageUploadSession } from "@/ts/storage"
import { MAX_IMAGE_FILE_SIZE_BYTES } from "@/constants/uploadLimits"

const IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp", "image/avif", "image/gif"]

export function validateStorageUpload(input: TStorageUploadRequest, backup = false) {
  if (!isStorageBucket(input.bucket) || !isStoragePath(input.filename) || (!backup && input.filename.includes("/")))
    throw new StorageRequestError("Invalid bucket or filename")
  if (typeof input.contentType !== "string" || !/^[a-z0-9.+-]+\/[a-z0-9.+-]+$/i.test(input.contentType) ||
    (!backup && !IMAGE_TYPES.includes(input.contentType))) throw new StorageRequestError("Unsupported file content type")
  const maximum = backup ? 5 * 1024 ** 3 : input.bucket === "23_product-images" ? MAX_IMAGE_FILE_SIZE_BYTES : 50 * 1024 ** 2
  if (!Number.isSafeInteger(input.size) || input.size < 1 || input.size > maximum)
    throw new StorageRequestError(`File size must be between 1 and ${maximum} bytes`)
  if (input.upsert !== undefined && typeof input.upsert !== "boolean") throw new StorageRequestError("Invalid overwrite option")
  if (input.folder !== undefined && typeof input.folder !== "string") throw new StorageRequestError("Invalid folder")
}

export function imageMatchesContentType(bytes: Uint8Array, contentType: string): boolean {
  const text = new TextDecoder("latin1").decode(bytes.subarray(0, 128))
  if (contentType === "image/png") return [137, 80, 78, 71, 13, 10, 26, 10].every((byte, index) => bytes[index] === byte)
  if (contentType === "image/jpeg") return bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255
  if (contentType === "image/gif") return text.startsWith("GIF87a") || text.startsWith("GIF89a")
  if (contentType === "image/webp") return text.startsWith("RIFF") && text.slice(8, 12) === "WEBP"
  return contentType === "image/avif" && text.slice(4, 8) === "ftyp" && /avif|avis/.test(text.slice(8))
}

async function createUploadSession(actor: TStorageActor, input: TStorageUploadRequest, backup: boolean, provider: IStorageProvider) {
  const folder = backup ? "" : await authorizedStorageFolder(actor, input.bucket, input.entityId)
  if (!backup && input.folder && input.folder !== folder && !actor.cookie)
    throw new StorageRequestError("Folder does not match the verified identity", 403)
  if (provider.name === "supabase" && input.size > SUPABASE_STAGING_MAX_BYTES)
    throw new StorageRequestError("Supabase browser imports support files up to 50 MiB. Use the local migration command for larger files.", 413)
  let filename = input.filename
  if (!backup && !input.upsert) {
    const objects = await listStorageObjects(provider, input.bucket, folder)
    const existing = new Set(objects.map(object => object.path))
    const extensionAt = filename.lastIndexOf(".")
    const basename = extensionAt > 0 ? filename.slice(0, extensionAt) : filename
    const extension = extensionAt > 0 ? filename.slice(extensionAt) : ""
    let index = 1
    while (existing.has(`${folder}/${filename}`)) filename = `${basename}_${index++}${extension}`
  }
  const path = folder ? `${folder}/${filename}` : filename
  if (!isStoragePath(path)) throw new StorageRequestError("Invalid storage path")
  const uploadId = randomUUID()
  const session: TStorageUploadSession = { actor: actor.id, reference: { provider: provider.name, bucket: input.bucket, path },
    stagePath: `${R2_UPLOAD_PREFIX}${uploadId}/${filename.split("/").pop()}`, size: input.size, contentType: input.contentType,
    upsert: input.upsert ?? false, expiresAt: new Date(Date.now() + UPLOAD_SIGNATURE_SECONDS * 1000).toISOString(), backup }
  const redis = storageRedis()
  const extensionAt = filename.lastIndexOf(".")
  const basename = extensionAt > 0 ? filename.slice(0, extensionAt) : filename
  const extension = extensionAt > 0 ? filename.slice(extensionAt) : ""
  let suffix = 1
  while (!await redis.set(fileKey(session), uploadId, { nx: true, ex: UPLOAD_SIGNATURE_SECONDS + 120 })) {
    if (input.upsert || backup || suffix > 100) throw new StorageRequestError("This filename has a pending upload; try again", 409)
    session.reference.path = `${folder}/${basename}_${suffix++}${extension}`
  }
  return { uploadId, session }
}

async function signStorageUpload(provider: IStorageProvider, uploadId: string, session: TStorageUploadSession): Promise<TStorageUploadDestination> {
  const destination = await provider.signUpload(session.stagePath, session.contentType, session.size)
  await storageRedis().set(uploadKey(uploadId), session, { ex: 24 * 60 * 60 })
  return {
    uploadId,
    method: "PUT",
    ...destination,
    expiresAt: session.expiresAt,
    reference: session.reference,
    publicUrl: provider.publicUrl(session.reference.bucket, session.reference.path),
  }
}

export async function prepareStorageUpload(actor: TStorageActor, input: TStorageUploadRequest, backup = false, providerName?: TStorageProviderName): Promise<TStorageUploadDestination> {
  if (fileChangesPaused()) throw new StorageRequestError("File changes are paused for storage synchronization", 503)
  if (backup && !actor.admin) throw new StorageRequestError("ADMIN role required", 403)
  if (providerName && !backup) throw new StorageRequestError("Provider selection requires an ADMIN backup import", 403)
  validateStorageUpload(input, backup)
  const provider = storageProvider(providerName ?? activeStorageProvider())
  const { uploadId, session } = await createUploadSession(actor, input, backup, provider)
  let reserved = false
  try {
    // Reserve the staged file and its publication copy, including overwrite peaks.
    // Supabase signatures do not bind a per-file length: reserve its enforced bucket maximum.
    const temporaryMaximum = provider.name === "supabase" ? SUPABASE_STAGING_MAX_BYTES : input.size
    await reserveStorageCapacity(provider, uploadId, temporaryMaximum + input.size, session.stagePath)
    reserved = true
    return await signStorageUpload(provider, uploadId, session)
  } catch (error) {
    if (reserved) await cancelStorageCapacity(provider, uploadId)
    await releaseFileLock(session, uploadId)
    throw error
  }
}

export function prepareBackupStorageUploads(actor: TStorageActor, files: TStorageUploadRequest[], providerName?: TStorageProviderName,
  skipExisting?: false): Promise<TStorageUploadDestination[]>
export function prepareBackupStorageUploads(actor: TStorageActor, files: TStorageUploadRequest[], providerName?: TStorageProviderName,
  skipExisting?: boolean): Promise<TBackupStorageUploadDestination[]>
export async function prepareBackupStorageUploads(actor: TStorageActor, files: TStorageUploadRequest[], providerName?: TStorageProviderName,
  skipExisting = false): Promise<TBackupStorageUploadDestination[]> {
  if (!actor.admin) throw new StorageRequestError("ADMIN role required", 403)
  if (fileChangesPaused()) throw new StorageRequestError("File changes are paused for storage synchronization", 503)
  if (!Array.isArray(files) || files.length < 1 || files.length > BACKUP_FILE_BATCH_SIZE)
    throw new StorageRequestError(`Supply 1 to ${BACKUP_FILE_BATCH_SIZE} files per request`)
  for (const file of files) validateStorageUpload(file, true)
  if (new Set(files.map(file => `${file.bucket}/${file.filename}`)).size !== files.length)
    throw new StorageRequestError("Duplicate file paths in backup batch")
  const provider = storageProvider(providerName ?? activeStorageProvider())
  const skipped: TBackupStorageUploadDestination[] = []
  if (skipExisting) {
    const pending: TStorageUploadRequest[] = []
    for (let start = 0; start < files.length; start += BACKUP_METADATA_CONCURRENCY) {
      const objects = await Promise.all(files.slice(start, start + BACKUP_METADATA_CONCURRENCY)
        .map(async file => ({ file, exists: await provider.inspect(file.bucket, file.filename) })))
      for (const { file, exists } of objects) {
        if (exists) skipped.push({ skipped: true, reason: "already-exists",
          reference: { provider: provider.name, bucket: file.bucket, path: file.filename } })
        else pending.push(file)
      }
    }
    files = pending
    if (!files.length) return skipped
  }
  if (provider.name === "supabase" && files.some(file => file.size > SUPABASE_STAGING_MAX_BYTES))
    throw new StorageRequestError("Supabase browser imports support files up to 50 MiB. Use the local migration command for larger files.", 413)
  const uploads: { uploadId: string; session: TStorageUploadSession }[] = []
  const destinations: TStorageUploadDestination[] = []
  try {
    for (let start = 0; start < files.length; start += BACKUP_METADATA_CONCURRENCY) {
      const allSettledResp = await Promise.allSettled(files.slice(start, start + BACKUP_METADATA_CONCURRENCY)
        .map(file => createUploadSession(actor, { ...file, upsert: true }, true, provider)))
      for (const result of allSettledResp) if (result.status === "fulfilled") uploads.push(result.value)
      const failed = allSettledResp.find(result => result.status === "rejected")
      if (failed?.status === "rejected") throw failed.reason
    }
    // Verify the inventory once and reserve the whole batch atomically, including temporary copies.
    await reserveStorageCapacityBatch(provider, uploads.map(({ uploadId, session }) => ({ id: uploadId,
      bytes: session.size + (provider.name === "supabase" ? SUPABASE_STAGING_MAX_BYTES : session.size), stagePath: session.stagePath })))
    for (let start = 0; start < uploads.length; start += BACKUP_METADATA_CONCURRENCY) {
      const allSettledResp = await Promise.allSettled(uploads.slice(start, start + BACKUP_METADATA_CONCURRENCY)
        .map(({ uploadId, session }) => signStorageUpload(provider, uploadId, session)))
      for (const result of allSettledResp) if (result.status === "fulfilled") destinations.push(result.value)
      const failed = allSettledResp.find(result => result.status === "rejected")
      if (failed?.status === "rejected") throw failed.reason
    }
    return [...skipped, ...destinations]
  } catch (error) {
    // These signatures have not been returned to the caller, so no transfer can have started.
    // Capacity changes share one provider lease; cancel the unsent batch together.
    await Promise.allSettled([cancelStorageCapacityBatch(provider, uploads.map(upload => upload.uploadId))])
    await Promise.allSettled(uploads.flatMap(({ uploadId, session }) => [
      storageRedis().del(uploadKey(uploadId)), releaseFileLock(session, uploadId),
    ]))
    throw error
  }
}

type TCompletedUpload = { reference: TStorageReference; publicUrl: string }
type TPendingCompletion = { uploadId: string; session: TStorageUploadSession; provider: IStorageProvider; publish: () => Promise<TCompletedUpload> }

async function prepareStorageCompletion(actor: TStorageActor, uploadId: string, backupOnly = false): Promise<TPendingCompletion | { result: TCompletedUpload }> {
  if (!/^[0-9a-f-]{36}$/.test(uploadId)) throw new StorageRequestError("Invalid upload id")
  const redis = storageRedis()
  const session = await redis.get<TStorageUploadSession>(uploadKey(uploadId))
  if (!session || session.actor !== actor.id) throw new StorageRequestError("Upload does not belong to this caller", 403)
  if (backupOnly && !session.backup) throw new StorageRequestError("Backup upload required", 403)
  if (session.publicUrl) return { result: { reference: session.reference, publicUrl: session.publicUrl } }
  if (Date.parse(session.expiresAt) < Date.now()) throw new StorageRequestError("Upload authorization expired", 410)
  if (await redis.get(fileKey(session)) !== uploadId) throw new StorageRequestError("Upload reservation expired", 409)
  if (!await redis.set(`${uploadKey(uploadId)}:completing`, "1", { nx: true, ex: 60 }))
    throw new StorageRequestError("Upload verification is already running", 409)
  try {
    const provider = storageProvider(session.reference.provider)
    const { bucket } = session.reference
    const object = await provider.inspect(bucket, session.stagePath, true)
    if (!object || object.size !== session.size || object.contentType.split(";")[0] !== session.contentType ||
      (!session.backup && !imageMatchesContentType(await provider.readSample(bucket, session.stagePath, true), session.contentType))) {
      if (object) await provider.delete(bucket, session.stagePath, true)
      throw new StorageRequestError("Stored file does not match the authorized size or image type")
    }
    // Journal intent before publication so failures remain visible and rollback inventories are auditable.
    await redis.lpush("storage:23:journal", JSON.stringify({ action: "publish", uploadId, reference: session.reference,
      size: session.size, contentType: session.contentType, at: new Date().toISOString(), status: "prepared" }))
    const publicUrl = `${provider.publicUrl(bucket, session.reference.path)}?v=${uploadId}`
    return { uploadId, session, provider, publish: async () => {
      await provider.publish(session)
      const stored = await provider.inspect(bucket, session.reference.path)
      if (!stored || stored.size !== session.size || stored.contentType.split(";")[0] !== session.contentType)
        throw new Error("Published file verification failed")
      await redis.set(uploadKey(uploadId), { ...session, publicUrl }, { ex: 24 * 60 * 60 })
      await redis.lpush("storage:23:journal", JSON.stringify({ action: "publish", uploadId, reference: session.reference,
        size: session.size, contentType: session.contentType, etag: stored.etag, at: new Date().toISOString(), status: "complete" }))
      return { reference: session.reference, publicUrl }
    } }
  } catch (error) {
    await redis.del(`${uploadKey(uploadId)}:completing`)
    throw error
  }
}

export async function completeStorageUpload(actor: TStorageActor, uploadId: string): Promise<TCompletedUpload> {
  const completion = await prepareStorageCompletion(actor, uploadId)
  if ("result" in completion) return completion.result
  try {
    const settleStorageCapacityResp = await settleStorageCapacity(completion.provider, uploadId, completion.publish)
    // Keep the immutable staged file until its signature expires; scheduled cleanup removes it.
    // Deleting it immediately would allow the same signed URL to create a second temporary copy.
    await releaseFileLock(completion.session, uploadId)
    return settleStorageCapacityResp
  } finally { await storageRedis().del(`${uploadKey(uploadId)}:completing`) }
}

export async function completeBackupStorageUploads(actor: TStorageActor, uploadIds: string[]): Promise<API.BackupFilesCompleteResult[]> {
  if (!actor.admin) throw new StorageRequestError("ADMIN role required", 403)
  if (!Array.isArray(uploadIds) || uploadIds.length < 1 || uploadIds.length > BACKUP_COMPLETION_BATCH_SIZE ||
    uploadIds.some(id => typeof id !== "string" || !/^[0-9a-f-]{36}$/.test(id)) || new Set(uploadIds).size !== uploadIds.length)
    throw new StorageRequestError(`Supply 1 to ${BACKUP_COMPLETION_BATCH_SIZE} distinct upload ids`)
  const prepared = await Promise.allSettled(uploadIds.map(id => prepareStorageCompletion(actor, id, true)))
  const results: API.BackupFilesCompleteResult[] = []
  const pending: TPendingCompletion[] = []
  for (const [index, result] of prepared.entries()) {
    if (result.status === "rejected") results.push({ uploadId: uploadIds[index], error: String(result.reason instanceof Error ? result.reason.message : result.reason) })
    else if ("result" in result.value) results.push({ uploadId: uploadIds[index], ...result.value.result })
    else pending.push(result.value)
  }
  try {
    for (const name of ["r2", "supabase"] as const) {
      const group = pending.filter(completion => completion.provider.name === name)
      if (!group.length) continue
      try {
        const published = await settleStorageCapacityBatch(group[0].provider,
          group.map(completion => ({ id: completion.uploadId, publish: completion.publish })))
        for (const [index, result] of published.entries()) {
          const completion = group[index]
          if (result.status === "rejected") results.push({ uploadId: completion.uploadId, error: String(result.reason instanceof Error ? result.reason.message : result.reason) })
          else {
            await releaseFileLock(completion.session, completion.uploadId)
            results.push({ uploadId: completion.uploadId, ...result.value })
          }
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        for (const completion of group) if (!results.some(result => result.uploadId === completion.uploadId))
          results.push({ uploadId: completion.uploadId, error: message })
      }
    }
    return results
  } finally {
    await Promise.allSettled(pending.map(completion => storageRedis().del(`${uploadKey(completion.uploadId)}:completing`)))
  }
}
