import { createReadStream, createWriteStream } from "node:fs"
import { mkdtemp, readFile, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import path from "node:path"
import { randomUUID } from "node:crypto"
import { Readable } from "node:stream"
import { pipeline } from "node:stream/promises"

import { copyFileVerified, referenceUrl, streamDigest, verifyDestination, writeManifest } from "./archive.mjs"
import { r2Config } from "@/config/r2Config"

function inventoryIdentity(objects) {
  return objects.map(object => `${object.bucket}/${object.path}:${object.size}:${object.etag}:${object.updatedAt}`).sort().join("\n")
}

export async function synchronize(source, target, manifestPath, { apply = false, concurrency = 3, baselinePath = null, mirrorDeletions = false } = {}) {
  if (!Number.isInteger(concurrency) || concurrency < 1 || concurrency > 8) throw new Error("Concurrency must be between 1 and 8")
  const inventory = await source.inventory()
  if (apply && inventory.reduce((bytes, file) => bytes + file.size, 0) > r2Config.totalForAllUsersGB * 1000 ** 3)
    throw new Error(`The current source files exceed the shared ${r2Config.totalForAllUsersGB} GB application limit`)
  const keys = new Set(inventory.map(object => `${object.bucket}/${object.path}`))
  if (keys.size !== inventory.length) throw new Error("Duplicate source inventory keys")
  let previous = null
  try { previous = JSON.parse(await readFile(manifestPath, "utf8")) } catch (error) { if (error.code !== "ENOENT") throw error }
  if (previous && (previous.source !== source.name || previous.target !== target.name ||
    (previous.sourceIdentity && previous.sourceIdentity !== source.identity) ||
    (previous.targetIdentity && previous.targetIdentity !== target.identity))) throw new Error("Manifest provider or account/bucket mismatch")
  const baseline = baselinePath ? JSON.parse(await readFile(baselinePath, "utf8")) : previous
  if (baselinePath && (!baseline.verifiedInventoryAt || baseline.source !== target.name || baseline.target !== source.name ||
    (baseline.sourceIdentity && baseline.sourceIdentity !== target.identity) ||
    (baseline.targetIdentity && baseline.targetIdentity !== source.identity)))
    throw new Error("Rollback baseline provider or account/bucket mismatch")
  const previousByKey = new Map((previous?.files ?? []).map(file => [file.destinationKey, file]))
  const manifest = { version: 1, operation: baselinePath ? "rollback" : "sync", source: source.name, target: target.name,
    sourceIdentity: source.identity, targetIdentity: target.identity,
    createdAt: previous?.createdAt ?? new Date().toISOString(), files: [], missingSource: [], deletions: [] }
  let writes = Promise.resolve()
  const persist = () => { writes = writes.then(() => writeManifest(manifestPath, manifest)); return writes }
  const directory = await mkdtemp(path.join(tmpdir(), "23-storage-sync-"))
  let nextIndex = 0
  let failure = null
  try {
    await persist()
    const worker = async () => {
      while (nextIndex < inventory.length && !failure) {
        const object = inventory[nextIndex++]
        const destinationKey = `${object.bucket}/${object.path}`
        const old = previousByKey.get(destinationKey)
        const baselineFile = baseline?.files?.find(file => file.destinationKey === destinationKey)
        const file = { bucket: object.bucket, path: object.path, destinationKey, byteCount: object.size,
          contentType: object.contentType, source: source.name, target: target.name,
          originalReference: referenceUrl(source.name, object.bucket, object.path), status: "planned",
          previousChecksum: old?.status === "verified" ? old.checksum : old?.previousChecksum ?? baselineFile?.checksum }
        manifest.files.push(file)
        const temporary = path.join(directory, randomUUID())
        try {
          const stream = await source.read(object.bucket, object.path)
          await pipeline(Readable.from(stream), createWriteStream(temporary, { mode: 0o600, flags: "wx" }))
          const actual = await streamDigest(createReadStream(temporary))
          const latest = await source.inspect(object.bucket, object.path)
          if (!latest || actual.byteCount !== object.size || latest.etag !== object.etag || latest.updatedAt !== object.updatedAt)
            throw new Error(`Source changed during synchronization: ${destinationKey}`)
          file.checksum = actual.checksum
          await persist()
          if (apply) await copyFileVerified(target, file, temporary, persist, true)
        } catch (error) { if (file.status !== "conflict") file.status = "failed"; file.error = error.message; failure ??= error; await persist() }
        finally { await rm(temporary, { force: true }) }
      }
    }
    await Promise.all(Array.from({ length: Math.min(concurrency, inventory.length || 1) }, worker))
    if (failure) throw failure
    const baselineFiles = new Map([...(baseline?.files ?? []), ...(baseline?.missingSource ?? [])].map(file => [file.destinationKey, file]))
    const missingCandidates = [...baselineFiles.values()].filter(file => !keys.has(file.destinationKey))
    for (const file of missingCandidates) {
      manifest.missingSource.push({ ...file, reason: "Object is absent from the current source inventory" })
      if (!mirrorDeletions) continue
      if (file.status !== "verified") throw new Error(`Unverified deletion baseline: ${file.destinationKey}`)
      const existing = await target.inspect(file.bucket, file.path)
      if (!existing) continue
      if (!await verifyDestination(target, file)) throw new Error(`Deletion target changed independently: ${file.destinationKey}`)
      const deletion = { bucket: file.bucket, path: file.path, destinationKey: file.destinationKey, status: "planned" }
      manifest.deletions.push(deletion)
      await persist()
      if (apply) { await target.delete(file.bucket, file.path); deletion.status = "deleted"; await persist() }
    }
    await persist()
    if (inventoryIdentity(inventory) !== inventoryIdentity(await source.inventory())) throw new Error("Source inventory changed; keep file changes paused and repeat synchronization")
    if (apply && manifest.missingSource.length && !mirrorDeletions) throw new Error("Missing source objects need review and --mirror-deletions before cutover")
    manifest.completedAt = new Date().toISOString()
    if (apply) manifest.verifiedInventoryAt = manifest.completedAt
    await persist()
    return manifest
  } finally { await writes; await rm(directory, { recursive: true, force: true }) }
}
