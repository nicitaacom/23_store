import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { relinkBackupStorageBatch } from "./batch"
import type { TStorageActor } from "@/libs/storage/authorization"

const state = vi.hoisted(() => ({
  values: new Map<string, unknown>(), rows: new Map<string, Record<string, unknown>[]>(),
  files: [] as { bucket: string; path: string }[],
  authUsers: [] as { id: string; email: string; user_metadata: Record<string, unknown> }[],
  list: vi.fn(), listUsers: vi.fn(), compare: vi.fn(), range: vi.fn(),
}))
vi.mock("@/libs/storage/state", () => ({ storageRedis: () => ({
  get: async (key: string) => structuredClone(state.values.get(key) ?? null),
  set: async (key: string, value: unknown, options?: { nx?: boolean }) => {
    if (options?.nx && state.values.has(key)) return null
    state.values.set(key, structuredClone(value)); return "OK"
  },
  eval: async (_script: string, keys: string[], args: string[]) => {
    if (state.values.get(keys[0]) !== args[0]) return 0
    return Number(state.values.delete(keys[0]))
  },
}) }))
vi.mock("@/libs/storage/providers", () => ({ storageProvider: () => ({ name: "r2", list: state.list }) }))
vi.mock("@/libs/storage/relink", () => ({ compareStorageReferences: state.compare }))
vi.mock("@/libs/supabase/supabaseAdmin", () => ({ default: {
  from: (table: string) => {
    const query = { select: () => query, order: () => query,
      range: (from: number, to: number) => state.range(table, from, to) }
    return query
  },
  auth: { admin: { listUsers: state.listUsers } },
} }))

const actor: TStorageActor = { id: "admin-one", email: "owner@example.com", admin: true, guest: false, guestFolder: null }
const source = "https://source.supabase.co/storage/v1/object/public"
const image = "23_product-images/ownerexamplecom/product/image.avif"
const avatar = "23_avatar-images/ownerexamplecom/avatar.png"

beforeEach(() => {
  vi.clearAllMocks(); state.values.clear(); state.rows.clear(); state.files = []; state.authUsers = []
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://source.supabase.co")
  vi.stubEnv("NEXT_PUBLIC_R2_PUBLIC_URL", "https://files.jokik.fi")
  vi.stubEnv("STORAGE_PROVIDER", "supabase")
  state.list.mockImplementation(async (bucket: string, _prefix: string, cursor: string | null) => {
    const files = state.files.filter(file => file.bucket === bucket)
    return { objects: cursor ? files.slice(1) : files.slice(0, 1), cursor: !cursor && files.length > 1 ? "next" : null }
  })
  state.range.mockImplementation(async (table: string, from: number, to: number) => ({ data: structuredClone((state.rows.get(table) ?? []).slice(from, to + 1)), error: null }))
  state.listUsers.mockImplementation(async ({ page, perPage }: { page: number; perPage: number }) => ({
    data: { users: structuredClone(state.authUsers.slice((page - 1) * perPage, page * perPage)), nextPage: page * perPage < state.authUsers.length ? page + 1 : null }, error: null,
  }))
  state.compare.mockImplementation(async (table: string, key: Record<string, unknown>, before: Record<string, unknown>, after: Record<string, unknown>) => {
    if (table === "auth.users") {
      const user = state.authUsers.find(user => user.id === key.id)!
      if (JSON.stringify(user.user_metadata) !== JSON.stringify(before.raw_user_meta_data)) return false
      user.user_metadata = after.raw_user_meta_data as Record<string, unknown>; return true
    }
    const row = (state.rows.get(table) ?? []).find(row => Object.entries(key).every(([column, value]) => row[column] === value))
    if (!row) return false
    if (!Object.entries(before).every(([column, value]) => JSON.stringify(row[column]) === JSON.stringify(value))) return false
    Object.assign(row, after); return true
  })
})
afterEach(() => vi.unstubAllEnvs())

async function completeRelink() {
  let response = await relinkBackupStorageBatch(actor, { provider: "r2" })
  for (let request = 0; !response.done && request < 100; request++) {
    const writesBefore = state.compare.mock.calls.length
    response = await relinkBackupStorageBatch(actor, { provider: "r2", sessionId: response.sessionId, step: response.step })
    expect(state.compare.mock.calls.length - writesBefore).toBeLessThanOrEqual(20)
  }
  expect(response.done).toBe(true)
  return response
}

describe("bounded R2 database URL relinking", () => {
  it("updates scalar, product, variant, personalization, support and Auth URLs in bounded requests", async () => {
    state.files = [{ bucket: "23_product-images", path: image.slice("23_product-images/".length) },
      { bucket: "23_avatar-images", path: avatar.slice("23_avatar-images/".length) }]
    state.rows.set("23_users", [{ id: "user-0", email: "owner@example.com", avatar_url: `${source}/${avatar}` }])
    state.rows.set("23_products", Array.from({ length: 21 }, (_, index) => ({ id: `product-${index}`, owner_id: "user-0", price_id: `price-${index}`,
      img_url: [`${source}/${image}`, ...(index ? [] : [`${source}/23_product-images/missing.avif`, "https://external.example/image.png"])],
      variants: index ? [] : [{ image_url: `${source}/${image}` }], personalization: index ? null : { mockupUrl: `${source}/${image}` } })))
    state.rows.set("23_messages", [{ id: "message", images: [`${source}/${image}`], sender_avatar_url: `${source}/${avatar}` }])
    state.authUsers = Array.from({ length: 21 }, (_, index) => ({ id: `user-${index}`, email: "owner@example.com",
      user_metadata: { avatar_url: `${source}/${avatar}`, name: `User ${index}`, picture: "https://google.example/avatar" } }))
    const response = await completeRelink()
    expect(response).toMatchObject({ rowsUpdated: 23, authUsersUpdated: 21, urlsUpdated: 47, unresolvedReferences: 1, unresolvedPaths: 1, provider: "r2" })
    const product = state.rows.get("23_products")![0]
    expect(product.img_url).toEqual([`https://files.jokik.fi/${image}`, `${source}/23_product-images/missing.avif`, "https://external.example/image.png"])
    expect(product.variants).toEqual([{ image_url: `https://files.jokik.fi/${image}` }])
    expect(product.personalization).toEqual({ mockupUrl: `https://files.jokik.fi/${image}` })
    expect(state.authUsers.every(user => user.user_metadata.avatar_url === `https://files.jokik.fi/${avatar}`)).toBe(true)
    expect(state.authUsers[0].user_metadata).toMatchObject({ name: "User 0", picture: "https://google.example/avatar" })
    expect(process.env.STORAGE_PROVIDER).toBe("supabase")
    const writes = state.compare.mock.calls.length
    const retry = await relinkBackupStorageBatch(actor, { provider: "r2", sessionId: response.sessionId, step: response.step - 1 })
    expect(retry).toEqual(response)
    expect(state.compare.mock.calls.length).toBe(writes)
  })

  it("processes only one inventory page and makes no writes on the initial request", async () => {
    state.files = [{ bucket: "23_product-images", path: "one.png" }, { bucket: "23_product-images", path: "two.png" }]
    const response = await relinkBackupStorageBatch(actor, { provider: "r2" })
    expect(state.list).toHaveBeenCalledOnce()
    expect(response.done).toBe(false)
    expect(state.range).not.toHaveBeenCalled()
    expect(state.compare).not.toHaveBeenCalled()
    await relinkBackupStorageBatch(actor, { provider: "r2", sessionId: response.sessionId, step: response.step })
    expect(state.list).toHaveBeenLastCalledWith("23_product-images", "", "next")
  })

  it("rejects unauthorized callers, foreign sessions, changed providers and invalid continuations", async () => {
    await expect(relinkBackupStorageBatch({ ...actor, admin: false }, { provider: "r2" })).rejects.toMatchObject({ status: 403 })
    expect(state.values.size).toBe(0)
    const response = await relinkBackupStorageBatch(actor, { provider: "r2" })
    const input = { provider: "r2" as const, sessionId: response.sessionId, step: response.step }
    await expect(relinkBackupStorageBatch({ ...actor, id: "other-admin" }, input)).rejects.toMatchObject({ status: 403 })
    await expect(relinkBackupStorageBatch(actor, { ...input, provider: "supabase" })).rejects.toThrow("provider changed")
    await expect(relinkBackupStorageBatch(actor, { ...input, step: 999 })).rejects.toThrow("Invalid relink step")
    await expect(relinkBackupStorageBatch(actor, { ...input, sessionId: "../../other" })).rejects.toThrow("Invalid relink continuation")
  })

  it("preserves a concurrent row edit and leaves the same page available for retry", async () => {
    state.files = [{ bucket: "23_avatar-images", path: avatar.slice("23_avatar-images/".length) }]
    state.rows.set("23_users", [{ id: "user-0", email: "owner@example.com", avatar_url: `${source}/${avatar}` }])
    let response = await relinkBackupStorageBatch(actor, { provider: "r2" })
    while (response.step < 7) response = await relinkBackupStorageBatch(actor, { provider: "r2", sessionId: response.sessionId, step: response.step })
    state.compare.mockResolvedValueOnce(false)
    const input = { provider: "r2" as const, sessionId: response.sessionId, step: response.step }
    await expect(relinkBackupStorageBatch(actor, input)).rejects.toMatchObject({ status: 409 })
    expect(state.rows.get("23_users")![0].avatar_url).toBe(`${source}/${avatar}`)
    expect((await relinkBackupStorageBatch(actor, input)).rowsUpdated).toBe(1)
  })
})
