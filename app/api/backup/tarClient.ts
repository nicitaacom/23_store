// Pure tar (.tar) builders/parsers + a browser-native gzip. Everything here is either pure
// `Buffer` math (works in the browser via Next's polyfill) or uses the built-in Web
// `CompressionStream` API — deliberately NO Node `zlib` import, so this module is safe to pull
// into the client bundle. Project-specific constants (which tables/buckets are backed up) live in
// ./backupConfig; this file is pure backup file plumbing.
import { isStoragePath } from "@/libs/storage/references"

// ── tar helpers ─────────────────────────────────────────────────────────────

function encodeOctal(value: number, length: number): string {
  return value.toString(8).padStart(length - 1, "0") + "\0"
}

function computeChecksum(header: Buffer): number {
  let sum = 0
  for (let index = 0; index < 512; index++) sum += header[index]
  return sum
}

function buildTarHeader(name: string, size: number, type: "0" | "5" = "0"): Buffer {
  const header = Buffer.alloc(512, 0)

  // Encode name (up to 100 bytes). For long names use GNU long-name extension.
  const nameBytes = Buffer.from(name, "utf8").subarray(0, 100)
  nameBytes.copy(header, 0)

  // Permissions
  Buffer.from(encodeOctal(type === "5" ? 0o755 : 0o644, 8)).copy(header, 100)
  // uid / gid
  Buffer.from(encodeOctal(0, 8)).copy(header, 108)
  Buffer.from(encodeOctal(0, 8)).copy(header, 116)
  // Size
  Buffer.from(encodeOctal(size, 12)).copy(header, 124)
  // Modification time
  Buffer.from(encodeOctal(Math.floor(Date.now() / 1000), 12)).copy(header, 136)
  // Checksum placeholder
  Buffer.from("        ").copy(header, 148)
  // Type flag: 0=file, 5=directory
  header[156] = type.charCodeAt(0)
  // UStar magic
  Buffer.from("ustar  \0").copy(header, 257)

  const checksum = computeChecksum(header)
  Buffer.from(encodeOctal(checksum, 8)).copy(header, 148)

  return header
}

/** Build a GNU long-name header so paths > 100 bytes work */
function buildLongNameEntry(name: string): Buffer[] {
  const nameData = Buffer.from(name + "\0", "utf8")
  const padding = (512 - (nameData.length % 512)) % 512
  const header = Buffer.alloc(512, 0)
  Buffer.from("././@LongLink").copy(header, 0)
  Buffer.from(encodeOctal(0, 8)).copy(header, 100)
  Buffer.from(encodeOctal(0, 8)).copy(header, 108)
  Buffer.from(encodeOctal(0, 8)).copy(header, 116)
  Buffer.from(encodeOctal(nameData.length, 12)).copy(header, 124)
  Buffer.from(encodeOctal(Math.floor(Date.now() / 1000), 12)).copy(header, 136)
  Buffer.from("        ").copy(header, 148)
  header[156] = "L".charCodeAt(0)
  Buffer.from("ustar  \0").copy(header, 257)
  const checksum = computeChecksum(header)
  Buffer.from(encodeOctal(checksum, 8)).copy(header, 148)
  return [header, nameData, Buffer.alloc(padding, 0)]
}

export function addTarEntry(chunks: Buffer[], name: string, data: Buffer): void {
  if (Buffer.byteLength(name, "utf8") > 100) {
    buildLongNameEntry(name).forEach(entry => chunks.push(entry))
  }
  chunks.push(buildTarHeader(name, data.length))
  chunks.push(data)
  const pad = (512 - (data.length % 512)) % 512
  if (pad > 0) chunks.push(Buffer.alloc(pad, 0))
}

export function finalizeTar(chunks: Buffer[]): Buffer {
  // Two 512-byte zero blocks mark end of backup file
  chunks.push(Buffer.alloc(1024, 0))
  return Buffer.concat(chunks)
}

/** Parse a .tar (already decompressed) into named entries */
export function parseTar(buf: Buffer): Map<string, Buffer> {
  const entries = new Map<string, Buffer>()
  let offset = 0
  let pendingLongName: string | null = null

  while (offset + 512 <= buf.length) {
    const header = buf.subarray(offset, offset + 512)
    if (header.every(byte => byte === 0)) break
    const checksumText = header.subarray(148, 156).toString("ascii").replace(/\0/g, "").trim()
    const expectedChecksum = parseInt(checksumText, 8)
    const checksumHeader = Buffer.from(header)
    checksumHeader.fill(32, 148, 156)
    if (!Number.isSafeInteger(expectedChecksum) || expectedChecksum !== computeChecksum(checksumHeader))
      throw new Error("Invalid tar header checksum")

    const rawName = header.subarray(0, 100).toString("utf8").replace(/\0/g, "")
    const typeFlag = String.fromCharCode(header[156])
    const sizeText = header.subarray(124, 136).toString("utf8").replace(/\0/g, "").trim()
    if (!/^[0-7]+$/.test(sizeText)) throw new Error("Invalid tar entry size")
    const size = parseInt(sizeText, 8)
    if (!Number.isSafeInteger(size) || size < 0) throw new Error("Invalid tar entry size")

    offset += 512
    const dataEnd = offset + size
    const paddedSize = Math.ceil(size / 512) * 512
    if (dataEnd > buf.length || offset + paddedSize > buf.length) throw new Error("Truncated tar entry")

    if (typeFlag === "L") {
      // GNU long-name extension
      pendingLongName = buf.subarray(offset, offset + size).toString("utf8").replace(/\0/g, "")
    } else if (typeFlag === "0" || typeFlag === "\0") {
      const name = pendingLongName ?? rawName
      pendingLongName = null
      if (!isStoragePath(name)) throw new Error(`Unsafe imported tar path: ${name}`)
      if (entries.has(name)) throw new Error(`Duplicate imported tar entry: ${name}`)
      entries.set(name, buf.subarray(offset, dataEnd))
    } else if (typeFlag === "5") {
      pendingLongName = null
      if (!isStoragePath(rawName.replace(/\/$/, ""))) throw new Error("Unsafe imported tar directory")
    } else {
      throw new Error(`Unsupported tar entry type: ${typeFlag}`)
    }

    offset += paddedSize
  }
  if (offset + 512 > buf.length || pendingLongName) throw new Error("Truncated imported tar")

  return entries
}

// ── browser gzip ─────────────────────────────────────────────────────────────

/**
 * Gzip a buffer in the browser using the built-in CompressionStream Web API (zero deps).
 * Output is a standard gzip stream, so the server's Node `gunzipBuffer` decompresses it
 * identically — the backup file format is byte-compatible with server-built backup files.
 */
export async function gzipBufferClient(input: Uint8Array): Promise<Uint8Array> {
  const compressionStream = new CompressionStream("gzip")
  const stream = new Response(input).body!.pipeThrough(compressionStream)
  const compressed = await new Response(stream).arrayBuffer()
  return new Uint8Array(compressed)
}

/**
 * Decompress a gzip buffer in the browser using the built-in DecompressionStream Web API (zero
 * deps). The counterpart to gzipBufferClient — reads .tar.gz backup files client-side so backup file
 * bytes never reach a server function.
 */
export async function gunzipBufferClient(input: Uint8Array, maximumBytes = 512 * 1024 ** 2): Promise<Uint8Array> {
  const decompressionStream = new DecompressionStream("gzip")
  const stream = new Response(input).body!.pipeThrough(decompressionStream)
  const reader = stream.getReader()
  const chunks: Uint8Array[] = []
  let length = 0
  try {
    for (;;) {
      const next = await reader.read()
      if (next.done) break
      length += next.value.length
      if (length > maximumBytes) throw new Error("Browser backup exceeds 512 MiB; use the local streaming storage command")
      chunks.push(next.value)
    }
  } finally { await reader.cancel() }
  const bytes = new Uint8Array(length)
  let offset = 0
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length }
  return bytes
}
