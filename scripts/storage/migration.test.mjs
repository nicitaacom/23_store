import assert from "node:assert/strict"
import { test } from "node:test"
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import path from "node:path"
import { gzipSync } from "node:zlib"
import tar from "tar-stream"

import { copyArchive, inspectArchive, streamDigest } from "./archive.mjs"
import { synchronize } from "./synchronize.mjs"
import { exportFiles } from "./export.mjs"
import { STORAGE_BUCKETS } from "@/libs/storage/references"

async function directory(t) {
  const folder = await mkdtemp(path.join(tmpdir(), "23-storage-test-"))
  t.after(() => rm(folder, { recursive: true, force: true }))
  return folder
}
async function fixture(filename, entries) {
  const pack = tar.pack()
  const chunks = []
  const collected = (async () => { for await (const chunk of pack) chunks.push(chunk) })()
  for (const entry of entries) pack.entry({ name: entry.name, type: entry.type ?? "file", linkname: entry.linkname }, entry.bytes ?? Buffer.from("image"))
  pack.finalize(); await collected
  await writeFile(filename, gzipSync(Buffer.concat(chunks)))
}
function memoryBackend(name) {
  const files = new Map()
  const writes = []
  let revision = 0
  let failures = 0
  return {
    name, identity: `test/${name}`, files, writes,
    fail(count) { failures = count },
    add(bucket, objectPath, bytes, contentType = "image/png") {
      files.set(`${bucket}/${objectPath}`, { bucket, path: objectPath, size: bytes.length, bytes: Buffer.from(bytes), contentType,
        etag: String(++revision), updatedAt: new Date(1700000000000 + revision).toISOString() })
    },
    async inspect(bucket, objectPath) { return files.get(`${bucket}/${objectPath}`) ?? null },
    async read(bucket, objectPath) { return [files.get(`${bucket}/${objectPath}`).bytes] },
    async inventory() { return [...files.values()] },
    async put(file, temporary) {
      if (failures-- > 0) throw new Error("Interrupted transfer")
      writes.push(file.destinationKey)
      this.add(file.bucket, file.path, await readFile(temporary), file.contentType)
    },
    async delete(bucket, objectPath) { files.delete(`${bucket}/${objectPath}`) },
  }
}
const bucket = "23_product-images"

test("dry run inspects original exported files without credentials or writes", async t => {
  const folder = await directory(t)
  const archive = path.join(folder, "files.tar.gz")
  await fixture(archive, [{ name: `storage/${bucket}/owner/product/photo.png`, bytes: Buffer.from("exact bytes") },
    { name: "storage-content-types.json", bytes: Buffer.from(JSON.stringify({ [`${bucket}/owner/product/photo.png`]: "image/png" })) }])
  const manifest = await copyArchive(archive, path.join(folder, "manifest.json"), null)
  assert.equal(manifest.files[0].status, "planned")
  assert.equal(manifest.files[0].byteCount, 11)
  assert.equal(manifest.files[0].contentType, "image/png")
  assert.equal(manifest.files[0].checksum, (await streamDigest([Buffer.from("exact bytes")])).checksum)
})

test("mapped names preserve long Unicode paths and MIME on streamed read-back", async t => {
  const folder = await directory(t); const archive = path.join(folder, "files.tar.gz")
  const objectPath = `owner/product/фото ${"長".repeat(100)}.avif`
  const key = `${bucket}/${objectPath}`
  await fixture(archive, [{ name: "storage-files/0", bytes: Buffer.from("content") },
    { name: "storage-paths.json", bytes: Buffer.from(JSON.stringify({ "storage-files/0": key })) },
    { name: "storage-content-types.json", bytes: Buffer.from(JSON.stringify({ [key]: "image/avif" })) }])
  const backend = memoryBackend("r2")
  const manifest = await copyArchive(archive, path.join(folder, "manifest.json"), backend, { apply: true })
  assert.equal(manifest.files[0].status, "verified")
  assert.equal(backend.files.get(key).contentType, "image/avif")
  assert.equal(backend.files.get(key).bytes.toString(), "content")
})

for (const [reason, entries] of [
  ["traversal", [{ name: `storage/${bucket}/../file.png` }]],
  ["duplicate", [{ name: `storage/${bucket}/file.png` }, { name: `storage/${bucket}/file.png` }]],
  ["unsupported bucket", [{ name: "storage/unknown/file.png" }]],
  ["symbolic link", [{ name: `storage/${bucket}/link.png`, type: "symlink", linkname: "/tmp/elsewhere", bytes: Buffer.alloc(0) }]],
  ["missing mapping", [{ name: "storage-files/0" }]],
  ["duplicate destinations", [{ name: "storage-files/0" }, { name: "storage-files/1" },
    { name: "storage-paths.json", bytes: Buffer.from(JSON.stringify({ "storage-files/0": `${bucket}/a.png`, "storage-files/1": `${bucket}/a.png` })) }]],
]) {
  test(`rejects ${reason} before any destination writes`, async t => {
    const folder = await directory(t); const archive = path.join(folder, "files.tar.gz")
    await fixture(archive, entries)
    const backend = memoryBackend("r2")
    await assert.rejects(copyArchive(archive, path.join(folder, "manifest.json"), backend, { apply: true }))
    assert.equal(backend.writes.length, 0)
  })
}

test("malformed compressed data fails preflight", async t => {
  const folder = await directory(t); const archive = path.join(folder, "bad.tar.gz")
  await writeFile(archive, "not gzip")
  await assert.rejects(inspectArchive(archive))
})

test("interrupted transfers persist and resume without re-copying verified files", async t => {
  const folder = await directory(t); const archive = path.join(folder, "files.tar.gz"); const report = path.join(folder, "report.json")
  await fixture(archive, [{ name: `storage/${bucket}/a.png` }, { name: `storage/${bucket}/b.png` }])
  const backend = memoryBackend("r2"); backend.fail(3)
  await assert.rejects(copyArchive(archive, report, backend, { apply: true, concurrency: 1 }), /Interrupted/)
  const resumed = await copyArchive(archive, report, backend, { apply: true, concurrency: 1 })
  assert.equal(resumed.files.filter(file => file.status === "verified").length, 2)
  assert.equal(backend.writes.length, 2)
  await copyArchive(archive, report, backend, { apply: true })
  assert.equal(backend.writes.length, 2)
  backend.identity = "another-account/another-bucket"
  await assert.rejects(copyArchive(archive, report, backend, { apply: true }), /account\/bucket mismatch/)
})

test("existing destination changes cause conflicts and are preserved", async t => {
  const folder = await directory(t); const archive = path.join(folder, "files.tar.gz")
  await fixture(archive, [{ name: `storage/${bucket}/a.png` }])
  const backend = memoryBackend("r2"); backend.add(bucket, "a.png", Buffer.from("independent edit"), "application/octet-stream")
  await assert.rejects(copyArchive(archive, path.join(folder, "report.json"), backend, { apply: true }), /conflict/)
  assert.equal(backend.files.get(`${bucket}/a.png`).bytes.toString(), "independent edit")
})

test("round trip preserves all six categories and files added, overwritten and deleted after cutover", async t => {
  const folder = await directory(t); const source = memoryBackend("supabase"); const r2 = memoryBackend("r2")
  for (const category of STORAGE_BUCKETS) {
    source.add(category, "owner/changed.png", Buffer.from(`old ${category}`))
    source.add(category, "owner/deleted.png", Buffer.from(`remove ${category}`))
  }
  const cutover = path.join(folder, "cutover.json")
  await synchronize(source, r2, cutover, { apply: true })
  for (const category of STORAGE_BUCKETS) {
    r2.add(category, "owner/changed.png", Buffer.from(`new ${category}`))
    r2.add(category, "owner/новое фото.webp", Buffer.from(`created ${category}`), "image/webp")
    await r2.delete(category, "owner/deleted.png")
  }
  const report = path.join(folder, "rollback.json")
  const rollback = await synchronize(r2, source, report, { apply: true, baselinePath: cutover, mirrorDeletions: true })
  for (const category of STORAGE_BUCKETS) {
    assert.equal(source.files.get(`${category}/owner/changed.png`).bytes.toString(), `new ${category}`)
    const createdFile = source.files.get(`${category}/owner/новое фото.webp`)
    assert.equal(createdFile.bytes.toString(), `created ${category}`)
    assert.equal(createdFile.contentType, "image/webp")
    assert.equal(source.files.has(`${category}/owner/deleted.png`), false)
  }
  assert.equal(rollback.files.length, STORAGE_BUCKETS.length * 2)
  assert.equal(rollback.files.every(file => file.status === "verified"), true)
  assert.equal(rollback.deletions.length, STORAGE_BUCKETS.length)
  assert.equal(rollback.deletions.every(file => file.status === "deleted"), true)
  assert.ok(rollback.verifiedInventoryAt)
  const writes = source.writes.length
  await synchronize(r2, source, report, { apply: true, baselinePath: cutover, mirrorDeletions: true })
  assert.equal(source.writes.length, writes)
})

test("synchronization reconciles a stale backup and reports missing source files", async t => {
  const folder = await directory(t); const source = memoryBackend("supabase"); const r2 = memoryBackend("r2")
  source.add(bucket, "changed.png", Buffer.from("old")); source.add(bucket, "gone.png", Buffer.from("gone"))
  const manifest = path.join(folder, "sync.json")
  await synchronize(source, r2, manifest, { apply: true })
  source.add(bucket, "changed.png", Buffer.from("updated")); source.add(bucket, "new.png", Buffer.from("new")); await source.delete(bucket, "gone.png")
  await assert.rejects(synchronize(source, r2, manifest, { apply: true }), /Missing source/)
  assert.equal(r2.files.get(`${bucket}/changed.png`).bytes.toString(), "updated")
  assert.equal(r2.files.get(`${bucket}/new.png`).bytes.toString(), "new")
  assert.equal(r2.files.has(`${bucket}/gone.png`), true)
  await synchronize(source, r2, manifest, { apply: true, mirrorDeletions: true })
  assert.equal(r2.files.has(`${bucket}/gone.png`), false)
})

test("rollback preserves an independently edited destination", async t => {
  const folder = await directory(t); const source = memoryBackend("supabase"); const r2 = memoryBackend("r2")
  source.add(bucket, "a.png", Buffer.from("old")); const cutover = path.join(folder, "cutover.json")
  await synchronize(source, r2, cutover, { apply: true })
  source.add(bucket, "a.png", Buffer.from("edited outside migration")); r2.add(bucket, "a.png", Buffer.from("new"))
  await assert.rejects(synchronize(r2, source, path.join(folder, "rollback.json"), { apply: true, baselinePath: cutover, mirrorDeletions: true }), /independently/)
  assert.equal(source.files.get(`${bucket}/a.png`).bytes.toString(), "edited outside migration")
})

test("synchronization preserves existing different bytes without an overwrite baseline", async t => {
  const folder = await directory(t); const source = memoryBackend("supabase"); const r2 = memoryBackend("r2")
  source.add(bucket, "a.png", Buffer.from("source")); r2.add(bucket, "a.png", Buffer.from("independent"))
  await assert.rejects(synchronize(source, r2, path.join(folder, "sync.json"), { apply: true }), /conflict/)
  assert.equal(r2.files.get(`${bucket}/a.png`).bytes.toString(), "independent")
  assert.equal(r2.writes.length, 0)
})

test("rollback refuses a cutover baseline from another account", async t => {
  const folder = await directory(t); const source = memoryBackend("supabase"); const r2 = memoryBackend("r2")
  source.add(bucket, "a.png", Buffer.from("before")); const cutover = path.join(folder, "cutover.json")
  await synchronize(source, r2, cutover, { apply: true })
  source.identity = "another-account/supabase"
  await assert.rejects(synchronize(r2, source, path.join(folder, "rollback.json"), { apply: true, baselinePath: cutover }), /account\/bucket mismatch/)
  assert.equal(source.writes.length, 0)
})

test("a source inventory above 10 GB is rejected before copying", async t => {
  const folder = await directory(t); const source = memoryBackend("supabase"); const r2 = memoryBackend("r2")
  source.add(bucket, "a.png", Buffer.from("small fixture")); source.files.get(`${bucket}/a.png`).size = 10_000_000_001
  await assert.rejects(synchronize(source, r2, path.join(folder, "report.json"), { apply: true }), /10 GB/)
  assert.equal(r2.writes.length, 0)
})

test("local streaming export stays portable and preserves existing downloaded exports", async t => {
  const folder = await directory(t); const source = memoryBackend("supabase"); const r2 = memoryBackend("r2")
  source.add(bucket, `owner/фото ${"長".repeat(100)}.png`, Buffer.from("portable"))
  const archive = path.join(folder, "files.tar.gz")
  await exportFiles(source, archive, path.join(folder, "export.json"), true)
  const manifest = await copyArchive(archive, path.join(folder, "import.json"), r2, { apply: true })
  assert.equal(manifest.files[0].status, "verified")
  assert.equal([...r2.files.values()][0].bytes.toString(), "portable")
  await assert.rejects(exportFiles(source, archive, path.join(folder, "another-export.json"), true), /EEXIST/)
})
