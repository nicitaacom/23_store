import { NextRequest, NextResponse } from "next/server"

import supabaseAdmin from "@/libs/supabase/supabaseAdmin"
import { requireAdmin } from "../requireAdmin"
import {
  BACKUP_BUCKETS,
  BackupFile,
  BackupFileRef,
  BackupSnapshot,
  createBackupArchive,
  downloadFilesByRef,
  listBucketObjects,
  splitRefsByHalf,
} from "../backupTables"

export const runtime = "nodejs"
export const maxDuration = 60 // Vercel Hobby cap; large backups are split into halves (see ?half)

// Streams NDJSON so the client can show LIVE per-file progress while the server downloads + packs:
//   {"type":"progress","done":N,"total":M}            (one per file)
//   {"type":"done","fileName":"...","archive":"<base64 .tar.gz>"}   (final line)
//   {"type":"error","error":"..."}                    (on failure)
// Params: (none) full backup · ?half=front (tables + first half) · ?half=back (second half, no tables)
export async function GET(request: NextRequest) {
  const adminError = await requireAdmin()
  if (adminError) return NextResponse.json({ error: adminError }, { status: adminError === "Unauthorized" ? 401 : 403 })

  const half = request.nextUrl.searchParams.get("half") as "front" | "back" | null
  const encoder = new TextEncoder()

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (obj: unknown) => controller.enqueue(encoder.encode(JSON.stringify(obj) + "\n"))

      try {
        // Tables live in the full export and in the front half only (never duplicated in the back half).
        let snapshot: BackupSnapshot = {}
        if (half !== "back") {
          // backup_23_tables() is a custom rpc not present in generated types
          const { data, error } = await (supabaseAdmin.rpc as any)("backup_23_tables")
          if (error) {
            send({ type: "error", error: error.message })
            controller.close()
            return
          }
          snapshot = (data ?? {}) as BackupSnapshot
        }

        // List all storage objects (cheap), then pick the subset this request is responsible for.
        const allRefs: BackupFileRef[] = []
        for (const bucket of BACKUP_BUCKETS) {
          allRefs.push(...(await listBucketObjects(supabaseAdmin.storage, bucket)))
        }
        const refs = half ? splitRefsByHalf(allRefs, half) : allRefs
        send({ type: "progress", done: 0, total: refs.length })

        // Download files, emitting a progress line after each one.
        const files: BackupFile[] = await downloadFilesByRef(supabaseAdmin.storage, refs, (done, total) =>
          send({ type: "progress", done, total }),
        )

        const archive = await createBackupArchive(snapshot, files)
        const date = new Date().toISOString().slice(0, 10)
        const fileName = half ? `23_backup-${date}-${half}.tar.gz` : `23_backup-${date}.tar.gz`
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
      "X-Accel-Buffering": "no", // disable proxy buffering so progress lines flush immediately
    },
  })
}
