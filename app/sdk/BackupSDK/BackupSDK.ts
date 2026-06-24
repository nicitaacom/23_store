import { splitRefsIntoChunks } from "@/api/backup/backupTables"
import { BaseSDK } from "../BaseSDK"

// How long (ms) a single export chunk should take at most on the server side.
// Kept well under the Vercel 60s cap to leave headroom for table dump + gzip.
const CHUNK_BUDGET_MS = 40_000

// Assumed server-side download throughput from Supabase Storage (bytes/ms ≈ 8 MB/s).
// Used to convert a speed-derived chunk target into server time: even if the client is slow,
// the server always downloads at ~this rate, so we size chunks to fit within the server budget.
const SERVER_THROUGHPUT_BYTES_PER_MS = 8 * 1024 // 8 MB/s

// Maximum chunk size in bytes — caps chunk size regardless of connection speed (100 MB).
const MAX_CHUNK_BYTES = 100 * 1024 * 1024

// Speed probe: fetch a publicly accessible static asset to measure download throughput.
// Using the Next.js favicon which is always present and small enough to be fast.
const SPEED_PROBE_URL = "/favicon.ico"
const SPEED_PROBE_DURATION_MS = 4000 // probe runs for up to 4 seconds

export class BackupSDK extends BaseSDK {
  async getManifest() {
    return this.getJson<API.BackupManifestResponse>("/api/backup/manifest")
  }

  // Measure download speed in bytes/ms by fetching a known asset for a fixed duration.
  // Falls back to a conservative 512 KB/s if the probe fails or returns 0 bytes.
  async measureSpeedBytesPerMs(): Promise<number> {
    const fallback = 512 // 512 bytes/ms = ~512 KB/s (conservative)
    try {
      const start = performance.now()
      const response = await fetch(`${SPEED_PROBE_URL}?_=${Date.now()}`, { cache: "no-store" })
      if (!response.ok || !response.body) return fallback

      const reader = response.body.getReader()
      let totalBytes = 0
      const deadline = start + SPEED_PROBE_DURATION_MS

      for (;;) {
        if (performance.now() >= deadline) {
          await reader.cancel()
          break
        }
        const { done, value } = await reader.read()
        if (done) break
        totalBytes += value.byteLength
      }

      const elapsed = performance.now() - start
      if (totalBytes === 0 || elapsed === 0) return fallback
      return totalBytes / elapsed
    } catch {
      return fallback
    }
  }

  // Export the full backup, splitting into as many chunks as needed so each fits within the
  // Vercel 60s budget at the user's measured connection speed. Chunks download sequentially
  // so they don't compete for bandwidth on slow connections.
  async exportBackup(onProgress?: (fraction: number) => void): Promise<{ blobs: Blob[]; fileNames: string[] }> {
    const [manifest, speedBytesPerMs] = await Promise.all([this.getManifest(), this.measureSpeedBytesPerMs()])

    // The bottleneck is the server fetching files from Storage, not the client download.
    // Size chunks by how much the server can pull in CHUNK_BUDGET_MS at SERVER_THROUGHPUT.
    const serverChunkBytes = Math.min(SERVER_THROUGHPUT_BYTES_PER_MS * CHUNK_BUDGET_MS, MAX_CHUNK_BYTES)

    // Also consider what the client can receive within the budget: if the user's connection is
    // slower than the server can produce, shrink chunks to what the client can absorb.
    const clientChunkBytes = speedBytesPerMs * CHUNK_BUDGET_MS
    const targetChunkBytes = Math.min(serverChunkBytes, clientChunkBytes, MAX_CHUNK_BYTES)

    // Build synthetic BackupFileRef-like objects with just sizes for splitRefsIntoChunks.
    const syntheticRefs = manifest.refSizes.map(size => ({
      bucket: "",
      path: "",
      size,
    }))
    const chunks = splitRefsIntoChunks(syntheticRefs, targetChunkBytes)

    // If everything fits in one chunk (or no storage files), do a single full export.
    if (chunks.length <= 1) {
      const blob = await this.streamExport("/api/backup/export", fraction => onProgress?.(fraction))
      return { blobs: [blob], fileNames: [] }
    }

    const blobs: Blob[] = []
    const fileNames: string[] = []

    for (let i = 0; i < chunks.length; i++) {
      const [from, to] = chunks[i]
      const chunkFractionStart = i / chunks.length
      const chunkFractionEnd = (i + 1) / chunks.length

      const blob = await this.streamExport(
        `/api/backup/export?from=${from}&to=${to}`,
        fraction => onProgress?.(chunkFractionStart + fraction * (chunkFractionEnd - chunkFractionStart)),
      )
      blobs.push(blob)
      const date = new Date().toISOString().slice(0, 10)
      fileNames.push(`23_backup-${date}-part${i + 1}of${chunks.length}.tar.gz`)
    }

    onProgress?.(1)
    return { blobs, fileNames }
  }

  // Upload a .tar.gz backup (upsert rows + re-upload files). Uses XMLHttpRequest for upload progress.
  importBackup(file: File, onProgress?: (fraction: number) => void) {
    return new Promise<API.BackupImportResponse>((resolve, reject) => {
      const formData = new FormData()
      formData.append("file", file)

      const xhr = new XMLHttpRequest()
      xhr.open("POST", this.getApiUrl("/api/backup/import"))
      xhr.responseType = "json"

      xhr.upload.onprogress = event => {
        if (event.lengthComputable && onProgress) onProgress(event.loaded / event.total)
      }
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          onProgress?.(1)
          resolve(xhr.response as API.BackupImportResponse)
        } else {
          const message = (xhr.response as { error?: string } | null)?.error || `Upload failed (${xhr.status})`
          reject(new Error(message))
        }
      }
      xhr.onerror = () => reject(new Error("Network error during upload"))
      xhr.send(formData)
    })
  }

  private async streamExport(path: string, onProgress?: (fraction: number) => void) {
    const response = await this.request(path, { method: "GET" })
    if (!response.body) throw new Error("No response stream")

    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ""
    let archive: Blob | null = null

    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })

      let newline: number
      while ((newline = buffer.indexOf("\n")) >= 0) {
        const line = buffer.slice(0, newline).trim()
        buffer = buffer.slice(newline + 1)
        if (!line) continue

        const event = JSON.parse(line) as
          | { type: "progress"; done: number; total: number }
          | { type: "done"; fileName: string; archive: string }
          | { type: "error"; error: string }

        if (event.type === "progress") {
          onProgress?.(event.total > 0 ? event.done / event.total : 0)
        } else if (event.type === "error") {
          throw new Error(event.error)
        } else if (event.type === "done") {
          archive = this.base64ToBlob(event.archive)
          onProgress?.(1)
        }
      }
    }

    if (!archive) throw new Error("Export stream ended without an archive")
    return archive
  }

  private base64ToBlob(base64: string) {
    const binary = atob(base64)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
    return new Blob([bytes], { type: "application/gzip" })
  }
}

export const backupSDK = new BackupSDK()
