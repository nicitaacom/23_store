import { randomUUID } from "node:crypto"

import { BACKUP_TABLES, relinkBackupStorageValue, selectBackupPathsByFolder, selectRelinkedPathsByFolder } from "../backupTables"
import { activeStorageProvider } from "@/libs/storage/config"
import { compareStorageReferences } from "@/libs/storage/relink"
import { isMissingSchemaError } from "@/utils/personalizationSchema"
import { slugifyEmail } from "@/utils/slugify"
import { storageProvider } from "@/libs/storage/providers"
import { storageRedis } from "@/libs/storage/state"
import supabaseAdmin from "@/libs/supabase/supabaseAdmin"
import { STORAGE_BUCKETS } from "@/libs/storage/references"
import { StorageRequestError } from "@/libs/storage/errors"
import type { TStorageActor } from "@/libs/storage/authorization"
import type { TStorageProviderName } from "@/ts/storage"

const ROW_PAGE_SIZE = 20
const EMAIL_PAGE_SIZE = 200
const UPDATE_CONCURRENCY = 4
const RELINK_TABLES = BACKUP_TABLES.filter(table => table.storageUrlColumns?.length)

type TRelinkSession = {
  actor: string
  provider: TStorageProviderName
  step: number
  phase: "files" | "emails" | "tables" | "auth" | "done"
  bucketIndex: number
  cursor: string | null
  offset: number
  tableIndex: number
  availablePaths: string[]
  emailByUserId: Record<string, string>
  unresolvedByTable: Record<string, string[]>
  result: API.BackupStorageRelinkResult
}

function relinkResponse(sessionId: string, session: TRelinkSession): Exclude<API.BackupStorageRelinkResponse, { error: string }> {
  const label = session.phase === "files" ? `Checking ${session.provider.toUpperCase()} files…`
    : session.phase === "emails" ? "Preparing image references…" : session.phase === "done" ? "Image URL relinking finished"
      : `Relinking image URLs to ${session.provider.toUpperCase()}…`
  return { ...session.result, sessionId, step: session.step, done: session.phase === "done", provider: session.provider, label }
}

function recordRelink(session: TRelinkSession, table: string, rowsUpdated: number, urlsUpdated: number,
  unresolvedReferences: number, unresolvedPaths: Iterable<string>) {
  const paths = new Set([...(session.unresolvedByTable[table] ?? []), ...unresolvedPaths])
  session.unresolvedByTable[table] = [...paths]
  let tableResult = session.result.tables.find(result => result.table === table)
  if (!tableResult) {
    tableResult = { table, rowsUpdated: 0, urlsUpdated: 0, unresolvedReferences: 0, unresolvedPaths: 0 }
    session.result.tables.push(tableResult)
  }
  tableResult.rowsUpdated += rowsUpdated
  tableResult.urlsUpdated += urlsUpdated
  tableResult.unresolvedReferences += unresolvedReferences
  tableResult.unresolvedPaths = paths.size
  if (table === "auth.users") session.result.authUsersUpdated += rowsUpdated
  else session.result.rowsUpdated += rowsUpdated
  session.result.urlsUpdated += urlsUpdated
  session.result.unresolvedReferences += unresolvedReferences
  session.result.unresolvedPaths = new Set(Object.values(session.unresolvedByTable).flat()).size
}

async function relinkTablePage(session: TRelinkSession, currentSupabaseUrl: string) {
  const config = RELINK_TABLES[session.tableIndex]
  const keys = config.onConflict.split(",")
   
  let query = supabaseAdmin.from(config.name).select("*")
  for (const key of keys) query = query.order(key, { ascending: true })
  const { data, error } = await query.range(session.offset, session.offset + ROW_PAGE_SIZE - 1)
  if (error && !(config.optional && isMissingSchemaError(error))) throw error
  const rows = (data ?? []) as Record<string, unknown>[]
  const availablePaths = new Set(session.availablePaths)
  const pathsByFolder = selectBackupPathsByFolder(availablePaths)
  const emails = new Map(Object.entries(session.emailByUserId))
  const unresolvedPaths = new Set<string>()
  let unresolvedReferences = 0
  const updates: { row: Record<string, unknown>; columns: Record<string, unknown>; urlsUpdated: number }[] = []
  for (const row of rows) {
    const expectedFolder = config.selectStorageFolder?.(row, emails)
    const unresolved = relinkBackupStorageValue(row[config.storageUrlColumns![0]], availablePaths,
      currentSupabaseUrl, undefined, session.provider).unresolvedPaths
    const relinkedPaths = expectedFolder ? selectRelinkedPathsByFolder(unresolved, expectedFolder, pathsByFolder) : undefined
    const columns: Record<string, unknown> = {}
    let urlsUpdated = 0
    for (const column of config.storageUrlColumns!) {
      const relinked = relinkBackupStorageValue(row[column], availablePaths, currentSupabaseUrl, relinkedPaths, session.provider)
      unresolvedReferences += relinked.unresolvedReferences
      relinked.unresolvedPaths.forEach(path => unresolvedPaths.add(path))
      if (!relinked.urlsUpdated) continue
      columns[column] = relinked.value
      urlsUpdated += relinked.urlsUpdated
    }
    if (urlsUpdated) updates.push({ row, columns, urlsUpdated })
  }
  for (let start = 0; start < updates.length; start += UPDATE_CONCURRENCY) {
    await Promise.all(updates.slice(start, start + UPDATE_CONCURRENCY).map(async update => {
      const rowKey = Object.fromEntries(keys.map(key => [key, update.row[key]]))
      const before = Object.fromEntries(Object.keys(update.columns).map(column => [column, update.row[column]]))
      if (!await compareStorageReferences(config.name, rowKey, before, update.columns))
        throw new StorageRequestError(`Concurrent row edit preserved: ${config.name}`, 409)
    }))
  }
  recordRelink(session, config.name, updates.length, updates.reduce((total, update) => total + update.urlsUpdated, 0),
    unresolvedReferences, unresolvedPaths)
  if (rows.length < ROW_PAGE_SIZE) {
    session.offset = 0
    session.tableIndex++
    if (session.tableIndex === RELINK_TABLES.length) session.phase = "auth"
  } else session.offset += rows.length
}

async function relinkAuthPage(session: TRelinkSession, currentSupabaseUrl: string) {
  const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page: session.offset / ROW_PAGE_SIZE + 1, perPage: ROW_PAGE_SIZE })
  if (error) throw error
  const availablePaths = new Set(session.availablePaths)
  const pathsByFolder = selectBackupPathsByFolder(availablePaths)
  const unresolvedPaths = new Set<string>()
  let rowsUpdated = 0
  let urlsUpdated = 0
  let unresolvedReferences = 0
  for (let start = 0; start < data.users.length; start += UPDATE_CONCURRENCY) {
    await Promise.all(data.users.slice(start, start + UPDATE_CONCURRENCY).map(async user => {
      const unresolved = relinkBackupStorageValue(user.user_metadata?.avatar_url, availablePaths,
        currentSupabaseUrl, undefined, session.provider).unresolvedPaths
      const paths = user.email ? selectRelinkedPathsByFolder(unresolved, `23_avatar-images/${slugifyEmail(user.email)}`, pathsByFolder) : undefined
      const relinked = relinkBackupStorageValue(user.user_metadata?.avatar_url, availablePaths, currentSupabaseUrl, paths, session.provider)
      unresolvedReferences += relinked.unresolvedReferences
      relinked.unresolvedPaths.forEach(path => unresolvedPaths.add(path))
      if (!relinked.urlsUpdated) return
      if (!await compareStorageReferences("auth.users", { id: user.id }, { raw_user_meta_data: user.user_metadata },
        { raw_user_meta_data: { ...user.user_metadata, avatar_url: relinked.value } }))
        throw new StorageRequestError("Concurrent authentication metadata edit preserved", 409)
      rowsUpdated++
      urlsUpdated += relinked.urlsUpdated
    }))
  }
  recordRelink(session, "auth.users", rowsUpdated, urlsUpdated, unresolvedReferences, unresolvedPaths)
  if (!data.nextPage) session.phase = "done"
  else session.offset += ROW_PAGE_SIZE
}

export async function relinkBackupStorageBatch(actor: TStorageActor, input: API.BackupStorageRelinkRequest) {
  if (!actor.admin) throw new StorageRequestError("ADMIN role required", 403)
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new StorageRequestError("Invalid relink request")
  if (input.provider !== undefined && input.provider !== "r2" && input.provider !== "supabase") throw new StorageRequestError("Invalid storage provider")
  if (input.sessionId !== undefined && (!/^[a-f0-9-]{36}$/.test(input.sessionId) || !Number.isInteger(input.step) || input.step! < 0))
    throw new StorageRequestError("Invalid relink continuation")
  const redis = storageRedis()
  const sessionId = input.sessionId ?? randomUUID()
  const key = `storage:23:relink:${sessionId}`
  if (!input.sessionId) {
    const session: TRelinkSession = { actor: actor.id, provider: input.provider ?? activeStorageProvider(), step: 0,
      phase: "files", bucketIndex: 0, cursor: null, offset: 0, tableIndex: 0, availablePaths: [], emailByUserId: {}, unresolvedByTable: {},
      result: { rowsUpdated: 0, urlsUpdated: 0, authUsersUpdated: 0, unresolvedReferences: 0, unresolvedPaths: 0, tables: [] } }
    await redis.set(key, session, { ex: 86400, nx: true })
  }
  const current = await redis.get<TRelinkSession>(key)
  if (!current) throw new StorageRequestError("Relink session expired; restart the import", 410)
  if (current.actor !== actor.id) throw new StorageRequestError("Relink does not belong to this caller", 403)
  if (input.provider !== undefined && input.provider !== current.provider) throw new StorageRequestError("Relink provider changed")
  const leaseId = randomUUID()
  if (!await redis.set(`${key}:running`, leaseId, { nx: true, ex: 70 })) throw new StorageRequestError("Image relinking is already running", 409)
  try {
    const session = await redis.get<TRelinkSession>(key)
    if (!session) throw new StorageRequestError("Relink session expired", 410)
    if (input.step !== undefined && input.step > session.step) throw new StorageRequestError("Invalid relink step")
    // A lost response retries the same step and receives the persisted result without repeating writes.
    if (session.phase === "done" || input.step !== undefined && input.step < session.step) return relinkResponse(sessionId, session)
    const currentSupabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    if (!currentSupabaseUrl) throw new Error("NEXT_PUBLIC_SUPABASE_URL is not set")
    if (session.phase === "files") {
      const bucket = STORAGE_BUCKETS[session.bucketIndex]
      const page = await storageProvider(session.provider).list(bucket, "", session.cursor)
      session.availablePaths.push(...page.objects.map(file => `${file.bucket}/${file.path}`))
      session.cursor = page.cursor
      if (!page.cursor && ++session.bucketIndex === STORAGE_BUCKETS.length) session.phase = "emails"
    } else if (session.phase === "emails") {
       
      const { data, error } = await supabaseAdmin.from("23_users").select("id,email").order("id").range(session.offset, session.offset + EMAIL_PAGE_SIZE - 1)
      if (error) throw error
      for (const user of data ?? []) if (user.email) session.emailByUserId[user.id] = user.email
      if ((data?.length ?? 0) < EMAIL_PAGE_SIZE) { session.phase = "tables"; session.offset = 0 }
      else session.offset += EMAIL_PAGE_SIZE
    } else if (session.phase === "tables") await relinkTablePage(session, currentSupabaseUrl)
    else await relinkAuthPage(session, currentSupabaseUrl)
    if (await redis.get(`${key}:running`) !== leaseId) throw new StorageRequestError("Relink reservation expired; retry this step", 409)
    session.step++
    await redis.set(key, session, { ex: 86400 })
    return relinkResponse(sessionId, session)
  } finally {
    await redis.eval("if redis.call('get', KEYS[1]) == ARGV[1] then return redis.call('del', KEYS[1]) end return 0", [`${key}:running`], [leaseId])
  }
}
