import { createReadStream, createWriteStream } from "node:fs"
import { mkdtemp, readFile, rename, rm, stat, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import path from "node:path"
import { createHash, randomUUID } from "node:crypto"
import { Transform } from "node:stream"
import { pipeline } from "node:stream/promises"
import { createGunzip } from "node:zlib"
import tar from "tar-stream"

import { isStorageBucket, isStoragePath, storagePublicUrl } from "@/libs/storage/references"
import { r2Config } from "@/config/r2Config"

const MAX_METADATA_BYTES = 16 * 1024 ** 2

export async function writeManifest(filename, manifest) {
  const temporary = `${filename}.${randomUUID()}.tmp`
  await writeFile(temporary, JSON.stringify(manifest, null, 2) + "\n", { mode: 0o600, flag: "wx" })
  await rename(temporary, filename)
}

async function walkArchive(filename, visit) {
  const extract = tar.extract()
  extract.on("entry", (header, stream, next) => {
    Promise.resolve().then(async () => {
      const name = header.type === "directory" ? header.name.replace(/\/$/, "") : header.name
      if (!isStoragePath(name)) throw new Error(`Unsafe archive path: ${header.name}`)
      if (!["file", "directory"].includes(header.type)) throw new Error(`Unsupported archive entry type: ${header.type}`)
      if (header.type === "directory") { for await (const _chunk of stream) { /* Consume the directory entry. */ } }
      else await visit(header, stream)
      next()
    }).catch(error => extract.destroy(error))
  })
  await pipeline(createReadStream(filename), createGunzip(), extract)
}

function stringMap(bytes, filename) {
  const value = JSON.parse(bytes.toString("utf8"))
  if (!value || typeof value !== "object" || Array.isArray(value) || Object.values(value).some(entry => typeof entry !== "string"))
    throw new Error(`Invalid ${filename}`)
  return value
}

export async function inspectArchive(filename, source = "supabase", target = "r2") {
  const sourceStat = await stat(filename)
  const files = []
  const names = new Set()
  let contentTypes = {}
  let paths = {}
  await walkArchive(filename, async (header, stream) => {
    if (names.has(header.name)) throw new Error(`Duplicate archive entry: ${header.name}`)
    names.add(header.name)
    const digest = createHash("sha256")
    const metadata = ["storage-paths.json", "storage-content-types.json"].includes(header.name)
    if (!metadata && !header.name.startsWith("storage/") && !header.name.startsWith("storage-files/"))
      throw new Error(`Unexpected files archive entry: ${header.name}; keep table archives separate`)
    const chunks = []
    let byteCount = 0
    for await (const chunk of stream) {
      byteCount += chunk.length
      if (metadata && byteCount > MAX_METADATA_BYTES) throw new Error("Archive metadata exceeds 16 MiB")
      digest.update(chunk)
      if (metadata) chunks.push(chunk)
    }
    if (byteCount !== header.size) throw new Error(`Truncated archive file: ${header.name}`)
    if (metadata) {
      const mapping = stringMap(Buffer.concat(chunks), header.name)
      if (header.name === "storage-paths.json") paths = mapping
      else contentTypes = mapping
    } else files.push({ archiveName: header.name, byteCount, checksum: digest.digest("hex") })
  })
  const keys = new Set()
  for (const file of files) {
    const mapped = Object.hasOwn(paths, file.archiveName) ? paths[file.archiveName] : null
    if (mapped && !file.archiveName.startsWith("storage-files/")) throw new Error(`Unexpected mapping: ${file.archiveName}`)
    const key = mapped ?? (file.archiveName.startsWith("storage/") ? file.archiveName.slice(8) : null)
    if (!key) throw new Error(`Missing storage-paths.json entry: ${file.archiveName}`)
    const separator = key.indexOf("/")
    const bucket = key.slice(0, separator)
    const objectPath = key.slice(separator + 1)
    if (separator < 1 || !isStorageBucket(bucket) || !isStoragePath(objectPath)) throw new Error(`Unsafe or unsupported object key: ${key}`)
    if (keys.has(key)) throw new Error(`Duplicate destination key: ${key}`)
    keys.add(key)
    const contentType = Object.hasOwn(contentTypes, key) ? contentTypes[key] : "application/octet-stream"
    if (!/^[a-z0-9.+-]+\/[a-z0-9.+-]+$/i.test(contentType)) throw new Error(`Invalid MIME type: ${key}`)
    Object.assign(file, { bucket, path: objectPath, destinationKey: key, contentType, source, target,
      originalReference: referenceUrl(source, bucket, objectPath), status: "planned" })
  }
  for (const name of Object.keys(paths)) if (!names.has(name) || !name.startsWith("storage-files/")) throw new Error(`Unused mapping: ${name}`)
  if (!files.length) throw new Error("Archive contains no storage files")
  const after = await stat(filename)
  if (sourceStat.size !== after.size || sourceStat.mtimeMs !== after.mtimeMs) throw new Error("Source archive changed during inspection")
  return { version: 1, operation: "archive", source, target, archive: path.resolve(filename),
    archiveSize: sourceStat.size, archiveMtime: sourceStat.mtimeMs, createdAt: new Date().toISOString(), files }
}

export function referenceUrl(provider, bucket, objectPath) {
  try { return storagePublicUrl(provider, bucket, objectPath) }
  catch { return `${provider}://${bucket}/${objectPath}` }
}

export async function streamDigest(stream) {
  const digest = createHash("sha256")
  let byteCount = 0
  for await (const chunk of stream) { digest.update(chunk); byteCount += chunk.length }
  return { checksum: digest.digest("hex"), byteCount }
}

export async function verifyDestination(backend, file) {
  const object = await backend.inspect(file.bucket, file.path)
  if (!object || object.size !== file.byteCount || object.contentType.split(";")[0] !== file.contentType) return false
  const actual = await streamDigest(await backend.read(file.bucket, file.path))
  return actual.checksum === file.checksum && actual.byteCount === file.byteCount
}

async function retry(operation, count = 3) {
  let failure
  for (let attempt = 0; attempt < count; attempt++) {
    try { return await operation() } catch (error) { failure = error }
    if (attempt + 1 < count) await new Promise(resolve => setTimeout(resolve, 200 * 2 ** attempt))
  }
  throw failure
}

export async function copyFileVerified(backend, file, temporary, persist, overwrite = false) {
  if (await verifyDestination(backend, file)) {
    file.status = "verified"; file.verifiedAt = new Date().toISOString(); await persist(); return
  }
  const existing = await backend.inspect(file.bucket, file.path)
  if (existing && (!overwrite || !file.previousChecksum)) { file.status = "conflict"; await persist(); throw new Error(`Destination conflict: ${file.destinationKey}`) }
  if (existing && file.previousChecksum) {
    const current = await streamDigest(await backend.read(file.bucket, file.path))
    if (current.checksum !== file.previousChecksum) { file.status = "conflict"; await persist(); throw new Error(`Destination changed independently: ${file.destinationKey}`) }
  }
  file.status = "copying"; await persist()
  try {
    await retry(() => backend.put(file, temporary, existing?.etag ?? null))
    if (!await retry(() => verifyDestination(backend, file))) throw new Error(`Read-back verification failed: ${file.destinationKey}`)
    file.status = "verified"; file.verifiedAt = new Date().toISOString(); await persist()
  } catch (error) { file.status = "failed"; file.error = error.message; await persist(); throw error }
}

export async function copyArchive(filename, manifestPath, backend, { apply = false, source = "supabase", target = "r2", concurrency = 3 } = {}) {
  if (!Number.isInteger(concurrency) || concurrency < 1 || concurrency > 8) throw new Error("Concurrency must be between 1 and 8")
  const inspected = await inspectArchive(filename, source, target)
  let previous = null
  try { previous = JSON.parse(await readFile(manifestPath, "utf8")) } catch (error) { if (error.code !== "ENOENT") throw error }
  if (previous && (previous.archive !== inspected.archive || previous.source !== source || previous.target !== target ||
    previous.files.length !== inspected.files.length || inspected.files.some(file => !previous.files.some(old => old.destinationKey === file.destinationKey && old.checksum === file.checksum))))
    throw new Error("Manifest belongs to a different archive, destination or source content")
  const manifest = previous ?? inspected
  let writes = Promise.resolve()
  const persist = () => { writes = writes.then(() => writeManifest(manifestPath, manifest)); return writes }
  await persist()
  if (!apply) return manifest
  if (!backend) throw new Error("An authenticated destination is required for --apply")
  if (manifest.files.reduce((bytes, file) => bytes + file.byteCount, 0) > r2Config.totalForAllUsersGB * 1000 ** 3)
    throw new Error(`The imported files exceed the shared ${r2Config.totalForAllUsersGB} GB application limit`)
  if (manifest.targetIdentity && manifest.targetIdentity !== backend.identity) throw new Error("Manifest destination account/bucket mismatch")
  manifest.targetIdentity = backend.identity
  await persist()
  const sourceStat = await stat(filename)
  if (sourceStat.size !== inspected.archiveSize || sourceStat.mtimeMs !== inspected.archiveMtime) throw new Error("Archive changed before copying")
  const directory = await mkdtemp(path.join(tmpdir(), "23-storage-"))
  const byName = new Map(manifest.files.map(file => [file.archiveName, file]))
  const active = new Set()
  let failure = null
  try {
    await walkArchive(filename, async (header, stream) => {
      if (failure) throw failure
      const file = byName.get(header.name)
      if (!file) { for await (const _chunk of stream) { /* Metadata was validated in the first pass. */ } return }
      if (active.size >= concurrency) await Promise.race(active)
      if (failure) throw failure
      const temporary = path.join(directory, randomUUID())
      const digest = createHash("sha256")
      const hashing = new Transform({ transform(chunk, _encoding, callback) { digest.update(chunk); callback(null, chunk) } })
      await pipeline(stream, hashing, createWriteStream(temporary, { mode: 0o600, flags: "wx" }))
      if (digest.digest("hex") !== file.checksum) throw new Error(`Archive content changed: ${file.archiveName}`)
      const task = copyFileVerified(backend, file, temporary, persist).catch(error => { failure ??= error })
        .finally(async () => { await rm(temporary, { force: true }); active.delete(task) })
      active.add(task)
    })
    await Promise.all(active)
    if (failure) throw failure
    manifest.completedAt = new Date().toISOString()
    await persist()
    return manifest
  } finally { await Promise.allSettled(active); await writes; await rm(directory, { recursive: true, force: true }) }
}
