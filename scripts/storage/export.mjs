import { open, rm } from "node:fs/promises"
import { createHash } from "node:crypto"
import { Readable, Transform } from "node:stream"
import { pipeline } from "node:stream/promises"
import { createGzip } from "node:zlib"
import tar from "tar-stream"

import { isStorageBucket, isStoragePath } from "@/libs/storage/references"
import { writeManifest } from "./archive.mjs"

const inventoryIdentity = files => files.map(file => `${file.bucket}/${file.path}:${file.size}:${file.etag}:${file.updatedAt}`).sort().join("\n")

export async function exportFiles(backend, archivePath, manifestPath, apply = false) {
  const files = await backend.inventory()
  const paths = {}; const contentTypes = {}; const keys = new Set()
  for (const [index, file] of files.entries()) {
    const key = `${file.bucket}/${file.path}`
    if (!isStorageBucket(file.bucket) || !isStoragePath(file.path) || !Number.isSafeInteger(file.size) || file.size < 0 || keys.has(key))
      throw new Error(`Invalid exported inventory: ${key}`)
    keys.add(key); paths[`storage-files/file-${String(index + 1).padStart(6, "0")}`] = key
    contentTypes[key] = file.contentType
  }
  const metadata = [{ name: "storage-paths.json", bytes: Buffer.from(JSON.stringify(paths)) },
    { name: "storage-content-types.json", bytes: Buffer.from(JSON.stringify(contentTypes)) }]
  if (metadata.some(file => file.bytes.length > 16 * 1024 ** 2)) throw new Error("Exported metadata exceeds the portable 16 MiB limit")
  const manifest = { version: 1, operation: "export", source: backend.name, sourceIdentity: backend.identity,
    createdAt: new Date().toISOString(), files: files.map(file => ({ ...file, bytes: undefined, status: "planned" })) }
  await writeManifest(manifestPath, manifest)
  if (!apply) return manifest
  // Exclusive creation preserves downloaded originals and existing exports.
  const output = await open(archivePath, "wx", 0o600)
  const pack = tar.pack()
  let failure = null
  const packed = pipeline(pack, createGzip(), output.createWriteStream()).catch(error => { failure ??= error; pack.destroy(error) })
  try {
    for (const file of metadata) pack.entry({ name: file.name, size: file.bytes.length }, file.bytes)
    for (const [index, file] of files.entries()) {
      if (failure) throw failure
      const name = `storage-files/file-${String(index + 1).padStart(6, "0")}`
      const digest = createHash("sha256"); let bytes = 0
      const hashing = new Transform({ transform(chunk, _encoding, callback) { bytes += chunk.length; digest.update(chunk); callback(null, chunk) } })
      await pipeline(Readable.from(await backend.read(file.bucket, file.path)), hashing, pack.entry({ name, size: file.size }))
      const latest = await backend.inspect(file.bucket, file.path)
      if (!latest || bytes !== file.size || latest.etag !== file.etag || latest.updatedAt !== file.updatedAt) throw new Error(`Source changed during export: ${file.bucket}/${file.path}`)
      Object.assign(manifest.files[index], { checksum: digest.digest("hex"), status: "exported" })
      await writeManifest(manifestPath, manifest)
    }
    if (inventoryIdentity(files) !== inventoryIdentity(await backend.inventory())) throw new Error("Source inventory changed during export; repeat with a new filename")
    pack.finalize(); await packed
    if (failure) throw failure
    manifest.completedAt = new Date().toISOString(); await writeManifest(manifestPath, manifest)
    return manifest
  } catch (error) {
    pack.destroy(error); await packed; await rm(archivePath, { force: true }); throw error
  } finally { await output.close() }
}
