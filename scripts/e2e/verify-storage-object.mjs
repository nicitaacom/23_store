import { createHash } from "node:crypto"

function getPublicUrl(reference) {
  if (!reference?.provider || !reference?.bucket || !reference?.path || reference.path.includes("*")) {
    throw new Error("Storage readback requires one exact provider, bucket, and object path")
  }
  if (typeof reference.publicUrl !== "string" || !reference.publicUrl.startsWith("https://")) {
    throw new Error("Storage readback requires the public URL returned by the production upload route")
  }
  return new URL(reference.publicUrl)
}

export async function verifyStorageObjectAbsent(environment, reference) {
  const url = getPublicUrl(reference)
  url.searchParams.set("e2e-absence-check", String(Date.now()))
  const response = await fetch(url, { method: "GET", cache: "no-store", signal: AbortSignal.timeout(20000) })
  await response.body?.cancel()
  if (response.status !== 404 && response.status !== 410) {
    throw new Error(`Production storage URL returned HTTP ${response.status} after deletion`)
  }
  return `${reference.provider}:${reference.bucket}/${reference.path}:public-url-http-${response.status}-after-app-delete`
}

export async function verifyStorageObjectPresent(environment, reference, expected) {
  if (!Number.isSafeInteger(expected?.size) || expected.size < 1 || !/^[a-f0-9]{64}$/i.test(expected?.sha256 ?? "")) {
    throw new Error("Storage presence readback requires the exact byte count and SHA-256 digest")
  }
  const url = getPublicUrl(reference)
  const response = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(30000) })
  if (!response.ok) throw new Error(`Production storage URL returned HTTP ${response.status}`)
  const bytes = Buffer.from(await response.arrayBuffer())

  const actualSha256 = createHash("sha256").update(bytes).digest("hex")
  if (bytes.length !== expected.size || actualSha256 !== expected.sha256.toLowerCase()) {
    throw new Error("Stored object bytes differ from the uploaded run-owned image")
  }
  return `${reference.provider}:${reference.bucket}/${reference.path}:public-bytes:${bytes.length}:sha256:${actualSha256}`
}
