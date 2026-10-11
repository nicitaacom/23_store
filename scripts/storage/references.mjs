import { appendFile, readFile } from "node:fs/promises"

import { BACKUP_TABLES } from "@/api/backup/backupConfig"
import { resolveStorageReference, storagePublicUrl } from "@/libs/storage/references"
import supabaseAdmin from "@/libs/supabase/supabaseAdmin"
import { verifyDestination } from "./archive.mjs"

export function rewriteVerifiedReferences(value, verifiedKeys, source, target) {
  const reference = resolveStorageReference(value)
  if (reference && reference.provider === source && verifiedKeys.has(`${reference.bucket}/${reference.path}`))
    return storagePublicUrl(target, reference.bucket, reference.path)
  if (Array.isArray(value)) return value.map(entry => rewriteVerifiedReferences(entry, verifiedKeys, source, target))
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).map(([name, entry]) => [name, rewriteVerifiedReferences(entry, verifiedKeys, source, target)]))
  return value
}

export async function applyReferenceChange(client, record) {
  const { data: updated, error } = await client.rpc("23_storage_update_references", {
    table_name: record.table, row_key: record.rowKey, before_values: record.before, after_values: record.after,
  })
  if (error) throw new Error(error.message)
  return updated === true
}

export async function relinkReferences(manifestPath, targetBackend, journalPath, apply = false, client = supabaseAdmin) {
  const manifest = JSON.parse(await readFile(manifestPath, "utf8"))
  if (!manifest.files?.length || manifest.source === manifest.target || manifest.target !== targetBackend.name)
    throw new Error("Invalid reference migration manifest")
  if (manifest.targetIdentity && manifest.targetIdentity !== targetBackend.identity) throw new Error("Reference manifest account/bucket mismatch")
  const verified = new Set()
  for (const file of manifest.files) {
    if (file.status !== "verified" || !await verifyDestination(targetBackend, file)) throw new Error(`Unverified reference destination: ${file.destinationKey}`)
    verified.add(file.destinationKey)
  }
  let updated = 0
  let conflicts = 0
  let unresolved = 0
  async function recordChange(table, rowKey, before, after) {
    if (JSON.stringify(before) === JSON.stringify(after)) return
    const record = { id: crypto.randomUUID(), table, rowKey, before, after, at: new Date().toISOString(), status: "planned" }
    await appendFile(journalPath, JSON.stringify(record) + "\n", { mode: 0o600 })
    if (!apply) return
    if (await applyReferenceChange(client, record)) { record.status = "complete"; updated++ }
    else { record.status = "conflict"; conflicts++ }
    await appendFile(journalPath, JSON.stringify(record) + "\n", { mode: 0o600 })
  }
  function unresolvedCount(value) {
    const reference = resolveStorageReference(value)
    if (reference?.provider === manifest.source && !verified.has(`${reference.bucket}/${reference.path}`)) return 1
    if (Array.isArray(value)) return value.reduce((total, entry) => total + unresolvedCount(entry), 0)
    if (value && typeof value === "object") return Object.values(value).reduce((total, entry) => total + unresolvedCount(entry), 0)
    return 0
  }
  // Read and plan every registered column before changing any rows.
  const changes = []
  for (const config of BACKUP_TABLES.filter(config => config.storageUrlColumns?.length)) {
    for (let offset = 0; ; offset += 500) {
      const { data: rows, error } = await client.from(config.name).select("*").order(config.onConflict.split(",")[0]).range(offset, offset + 499)
      if (error) { if (config.optional && ["42P01", "PGRST205"].includes(error.code)) break; throw new Error(error.message) }
      for (const row of rows ?? []) {
        const before = {}
        const after = {}
        for (const column of config.storageUrlColumns) {
          unresolved += unresolvedCount(row[column])
          const value = rewriteVerifiedReferences(row[column], verified, manifest.source, manifest.target)
          if (JSON.stringify(value) !== JSON.stringify(row[column])) { before[column] = row[column]; after[column] = value }
        }
        if (Object.keys(after).length) changes.push({ table: config.name, rowKey: Object.fromEntries(config.onConflict.split(",").map(column => [column, row[column]])), before, after })
      }
      if ((rows?.length ?? 0) < 500) break
    }
  }
  for (let page = 1; ; page++) {
    const { data: response, error } = await client.auth.admin.listUsers({ page, perPage: 500 })
    if (error) throw new Error(error.message)
    for (const user of response.users) {
      unresolved += unresolvedCount(user.user_metadata?.avatar_url)
      const avatar = rewriteVerifiedReferences(user.user_metadata?.avatar_url, verified, manifest.source, manifest.target)
      if (avatar !== user.user_metadata?.avatar_url) changes.push({ table: "auth.users", rowKey: { id: user.id },
        before: { raw_user_meta_data: user.user_metadata }, after: { raw_user_meta_data: { ...user.user_metadata, avatar_url: avatar } } })
    }
    if (response.users.length < 500) break
  }
  if (unresolved) throw new Error(`${unresolved} source references have no verified destination; resolve them before relinking`)
  for (const change of changes) await recordChange(change.table, change.rowKey, change.before, change.after)
  if (conflicts) throw new Error(`${conflicts} concurrent reference edits were preserved; repeat the dry run`)
  return { updated, conflicts, planned: changes.length }
}

export async function revertReferenceJournal(journalPath, apply = false, client = supabaseAdmin) {
  const records = (await readFile(journalPath, "utf8")).trim().split("\n").filter(Boolean).map(line => JSON.parse(line))
  const completed = new Map(records.filter(record => record.status === "complete").map(record => [record.id, record]))
  let conflicts = 0
  for (const record of Array.from(completed.values()).reverse()) {
    if (!apply) continue
    if (!await applyReferenceChange(client, { ...record, before: record.after, after: record.before })) conflicts++
  }
  if (conflicts) throw new Error(`${conflicts} current reference edits were preserved during reversal`)
  return { planned: completed.size, conflicts }
}
