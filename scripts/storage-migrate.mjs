import { readFile, writeFile } from "node:fs/promises"
import { parseArgs } from "node:util"

import { copyArchive, verifyDestination, writeManifest } from "./storage/archive.mjs"
import { inspectSourceAccess, migrationBackend } from "./storage/backend.mjs"
import { synchronize } from "./storage/synchronize.mjs"
import { exportFiles } from "./storage/export.mjs"
import { relinkReferences, revertReferenceJournal } from "./storage/references.mjs"
import { storageRedis } from "@/libs/storage/state"

const { values } = parseArgs({ options: {
  operation: { type: "string", default: "archive" }, archive: { type: "string" }, manifest: { type: "string" },
  source: { type: "string", default: "supabase" }, target: { type: "string", default: "r2" },
  apply: { type: "boolean", default: false }, concurrency: { type: "string", default: "3" },
  baseline: { type: "string" }, journal: { type: "string" }, "mirror-deletions": { type: "boolean", default: false },
  help: { type: "boolean", default: false },
} })

if (values.help) {
  console.log("pnpm storage:migrate --operation archive|export|sync|rollback|relink|revert-references|delete-report|purge-source|export-journal --archive files.tar.gz --manifest report.json [--source supabase|r2 --target r2|supabase --apply --baseline cutover.json --journal references.jsonl --concurrency 3 --mirror-deletions]")
  process.exit(0)
}
if (!["supabase", "r2"].includes(values.source) || !["supabase", "r2"].includes(values.target) ||
  (!["export", "export-journal"].includes(values.operation) && values.source === values.target))
  throw new Error("Choose different supabase and r2 source/target providers")
if (!values.manifest) throw new Error("Specify --manifest; originals are preserved and every run has an explicit report")
if (!["archive", "export", "sync", "rollback", "relink", "revert-references", "delete-report", "purge-source", "export-journal"].includes(values.operation)) throw new Error("Unsupported operation")

async function requirePausedUploads() {
  if (process.env.STORAGE_MIGRATION_PAUSED !== "true") throw new Error("Pause file changes in the deployment and set STORAGE_MIGRATION_PAUSED=true locally before this operation")
  const redis = storageRedis()
  let cursor = 0
  do {
    const response = await redis.scan(cursor, { match: "storage:23:upload:*", count: 100 })
    cursor = Number(response[0])
    for (const key of response[1]) {
      const session = await redis.get(key)
      if (session && typeof session === "object" && session.expiresAt && !session.publicUrl && Date.parse(session.expiresAt) > Date.now())
        throw new Error("Pending uploads must complete or expire before final synchronization")
    }
  } while (cursor)
}

let report
if (values.operation === "export") {
  if (!values.archive) throw new Error("Specify a new exported filename with --archive")
  report = await exportFiles(migrationBackend(values.source), values.archive, values.manifest, values.apply)
} else if (values.operation === "archive") {
  if (!values.archive) throw new Error("Supply the files archive with --archive")
  if (values.apply && values.source === "supabase") await inspectSourceAccess()
  report = await copyArchive(values.archive, values.manifest, values.apply ? migrationBackend(values.target) : null,
    { apply: values.apply, source: values.source, target: values.target, concurrency: Number(values.concurrency) })
} else if (values.operation === "sync" || values.operation === "rollback") {
  if (values.operation === "rollback" && !values.baseline) throw new Error("Rollback requires the preserved cutover --baseline manifest")
  if (values.apply) await requirePausedUploads()
  if (values.source === "supabase") await inspectSourceAccess()
  report = await synchronize(migrationBackend(values.source), migrationBackend(values.target), values.manifest,
    { apply: values.apply, concurrency: Number(values.concurrency), baselinePath: values.baseline ?? null, mirrorDeletions: values["mirror-deletions"] })
} else if (values.operation === "relink") {
  if (values.apply) await requirePausedUploads()
  report = await relinkReferences(values.manifest, migrationBackend(values.target), values.journal ?? `${values.manifest}.references.jsonl`, values.apply)
} else if (values.operation === "revert-references") {
  if (values.apply) await requirePausedUploads()
  report = await revertReferenceJournal(values.journal ?? `${values.manifest}.references.jsonl`, values.apply)
} else if (values.operation === "export-journal") {
  const redis = storageRedis()
  const records = []
  for (const key of ["storage:23:journal", "storage:23:references"]) {
    for (let offset = 0; ; offset += 500) {
      const page = await redis.lrange(key, offset, offset + 499)
      records.push(...page.map(record => ({ key, record })))
      if (page.length < 500) break
    }
  }
  await writeFile(values.journal ?? `${values.manifest}.operations.json`, JSON.stringify(records, null, 2), { mode: 0o600, flag: "wx" })
  report = { exportedRecords: records.length }
} else {
  const manifest = JSON.parse(await readFile(values.manifest, "utf8"))
  if (manifest.source !== values.source || manifest.target !== values.target || !manifest.verifiedInventoryAt)
    throw new Error("Source deletion requires the final verified inventory manifest")
  const elapsed = Date.now() - Date.parse(manifest.verifiedInventoryAt)
  if (!Number.isFinite(elapsed) || elapsed < 0) throw new Error("The verified inventory date is invalid")
  if (values.operation === "purge-source" && (!values.apply || elapsed < 14 * 24 * 60 * 60 * 1000))
    throw new Error("Explicit source purge needs --apply and the full 14-day rollback window")
  if (values.operation === "purge-source") await requirePausedUploads()
  const destination = migrationBackend(values.target)
  const source = migrationBackend(values.source)
  if ((manifest.sourceIdentity && manifest.sourceIdentity !== source.identity) ||
    (manifest.targetIdentity && manifest.targetIdentity !== destination.identity)) throw new Error("Deletion manifest account/bucket mismatch")
  report = { operation: values.operation, checkedAt: new Date().toISOString(), retentionDays: elapsed / (24 * 60 * 60 * 1000), files: [] }
  for (const file of manifest.files) {
    const currentSource = await source.inspect(file.bucket, file.path)
    const sourceMatches = currentSource && await verifyDestination(source, file)
    const destinationMatches = await verifyDestination(destination, file)
    const eligible = !!sourceMatches && destinationMatches && file.status === "verified"
    const item = { destinationKey: file.destinationKey, eligible, status: eligible ? "verified" : "preserved: changed or missing source/destination" }
    report.files.push(item)
    if (values.operation === "purge-source" && eligible) { await source.delete(file.bucket, file.path); item.status = "deleted" }
    await writeManifest(`${values.manifest}.source-deletion.json`, report)
  }
}
console.log(JSON.stringify({ operation: values.operation, applied: values.apply, manifest: values.manifest,
  files: report.files?.length, verified: report.files?.filter(file => file.status === "verified").length,
  missingSource: report.missingSource?.length, updated: report.updated, conflicts: report.conflicts }, null, 2))
