import { NextRequest, NextResponse } from "next/server"

import { requireAdmin } from "../requireAdmin"
import {
  BACKUP_BUCKETS,
  BackupFile,
  BackupFileRef,
  BackupSnapshot,
  createBackupArchive,
  downloadFilesByRef,
  listBucketObjects,
} from "../backupTables"
import supabaseAdmin from "@/libs/supabase/supabaseAdmin"

export const runtime = "nodejs"
export const maxDuration = 60 // Vercel Hobby cap; large backups are split into N chunks based on measured client speed (see ?from&to)

// Streams NDJSON so the client can show LIVE per-file progress while the server downloads + packs:
//   {"type":"progress","done":N,"total":M}
//   {"type":"done","fileName":"...","archive":"<base64 .tar.gz>"}
//   {"type":"error","error":"..."}
// Params: (none) = full backup · ?from=N&to=M = slice [N..M] inclusive of the storage file list.
// Tables are included when from is absent or 0 (first chunk always carries table data).
export async function GET(request: NextRequest) {
  const adminError = await requireAdmin()
  if (adminError) return NextResponse.json({ error: adminError }, { status: adminError === "Unauthorized" ? 401 : 403 })

  const fromParam = request.nextUrl.searchParams.get("from")
  const toParam = request.nextUrl.searchParams.get("to")
  const isChunked = fromParam !== null && toParam !== null
  const from = isChunked ? parseInt(fromParam, 10) : 0
  const isFirstChunk = !isChunked || from === 0
  const encoder = new TextEncoder()

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (payload: unknown) => controller.enqueue(encoder.encode(JSON.stringify(payload) + "\n"))

      try {
        // Tables are included in the full export and in the first chunk only.
        let snapshot: BackupSnapshot = {}
        if (isFirstChunk) {
          const { data, error } = await (supabaseAdmin.rpc as any)("backup_23_tables")
          if (error) {
            send({ type: "error", error: error.message })
            controller.close()
            return
          }
          snapshot = (data ?? {}) as BackupSnapshot
        }

        const allRefs: BackupFileRef[] = []
        for (const bucket of BACKUP_BUCKETS) {
          allRefs.push(...(await listBucketObjects(supabaseAdmin.storage, bucket)))
        }

        const refs = isChunked ? allRefs.slice(from, parseInt(toParam!, 10) + 1) : allRefs
        send({ type: "progress", done: 0, total: refs.length })

        const files: BackupFile[] = await downloadFilesByRef(supabaseAdmin.storage, refs, (done, total) =>
          send({ type: "progress", done, total }),
        )

        const archive = await createBackupArchive(snapshot, files)
        const date = new Date().toISOString().slice(0, 10)
        const suffix = isChunked ? `-part${from}` : ""
        const fileName = `23_backup-${date}${suffix}.tar.gz`
        send({ type: "done", fileName, archive: archive.toString("base64") })
        controller.close()
      } catch (error) {
        send({ type: "error", error: error instanceof Error ? error.message : String(error) })
        controller.close()
      }
    },
  })

  return new NextResponse(stream, {
    status: 200,
    headers: {
      "Content-Type": "application/x-ndjson",
      "Cache-Control": "no-store",
      "X-Accel-Buffering": "no",
    },
  })
}
