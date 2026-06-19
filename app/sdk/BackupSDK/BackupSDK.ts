import { BaseSDK } from "../BaseSDK"

export class BackupSDK extends BaseSDK {
  // Pre-flight: file count, total size, estimated export time, and whether to split into halves
  async getManifest() {
    return this.getJson<API.BackupManifestResponse>("/api/backup/manifest")
  }

  // Download the full .tar.gz snapshot (tables + all storage files) as a Blob, reporting LIVE progress.
  async exportBackup(onProgress?: (fraction: number) => void) {
    return this.streamExport("/api/backup/export", onProgress)
  }

  // Download one half of the backup when it's too big for a single sub-60s request, reporting LIVE progress.
  // "front" = tables + first half of files, "back" = second half of files only.
  async exportBackupHalf(half: "front" | "back", onProgress?: (fraction: number) => void) {
    return this.streamExport(`/api/backup/export?half=${half}`, onProgress)
  }

  // Upload a .tar.gz backup (upsert rows + re-upload files, append & replace-on-conflict), reporting upload progress.
  // Uses XMLHttpRequest because fetch cannot report upload progress.
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

  // Read the NDJSON export stream: update progress per file, then decode the final base64 archive to a Blob.
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

      // Process complete NDJSON lines; keep any partial trailing line in the buffer.
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
