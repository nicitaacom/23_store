import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { adjustCleanupCursor, authorizeStorageCleanup, oldEnoughForCleanup, runStorageCleanup } from "./cleanup"
import type { TStorageObject } from "@/ts/storage"

const state = vi.hoisted(() => {
  const values = new Map<string, unknown>()
  const objects = new Map<string, TStorageObject>()
  return { values, objects, names: [] as string[], removed: [] as string[], referenced: vi.fn(),
    redis: {
      get: async (key: string) => structuredClone(values.get(key) ?? null),
      set: async (key: string, value: unknown, options?: { nx?: boolean }) => {
        if (options?.nx && values.has(key)) return null
        values.set(key, structuredClone(value)); return "OK"
      },
      del: async (key: string) => Number(values.delete(key)),
      eval: async (_script: string, keys: string[], args: string[]) => values.get(keys[0]) === args[0] ? Number(values.delete(keys[0])) : 0,
    },
  }
})
vi.mock("./state", () => ({ storageRedis: () => state.redis }))
vi.mock("@/libs/supabase/supabaseAdmin", () => ({ default: { rpc: state.referenced } }))
vi.mock("./authorization", () => ({ StorageRequestError: class extends Error {} }))
vi.mock("./operations", () => ({ deleteStorageObject: async (reference: TStorageObject) => {
  state.removed.push(`${reference.provider}:${reference.path}`); state.objects.delete(reference.path)
} }))
vi.mock("./providers", () => ({ storageProvider: (name: string) => {
  state.names.push(name)
  return { name,
    list: async () => ({ objects: [...state.objects.values()], cursor: null }),
    listStaging: async () => ({ objects: [...state.objects.values()], cursor: null }),
    inspect: async (_bucket: string, path: string) => state.objects.get(path) ?? null,
    delete: async (_bucket: string, path: string) => { state.removed.push(`${name}:${path}`); state.objects.delete(path) },
  }
} }))

const now = Date.parse("2026-10-11T12:00:00Z")
function object(path: string, ageHours = 2): TStorageObject {
  return { provider: "r2", bucket: "23_support-guest-images", path, size: 8, contentType: "image/png",
    etag: path, updatedAt: new Date(now - ageHours * 60 * 60 * 1000).toISOString() }
}
beforeEach(() => {
  vi.useFakeTimers(); vi.setSystemTime(now)
  vi.stubEnv("STORAGE_PROVIDER", "r2"); vi.stubEnv("STORAGE_CLEANUP_ENABLED", "true"); vi.stubEnv("STORAGE_MIGRATION_PAUSED", "false")
  vi.stubEnv("NEXT_PUBLIC_R2_PUBLIC_URL", "https://files.example"); vi.stubEnv("CRON_SECRET", "fixture-cron-secret")
  state.values.clear(); state.objects.clear(); state.removed.length = 0; state.names.length = 0
  state.referenced.mockReset().mockResolvedValue({ data: false, error: null })
})
afterEach(() => { vi.useRealTimers(); vi.unstubAllEnvs() })

describe("provider cleanup", () => {
  it("requires the exact bearer secret and preserves missing or recent dates", () => {
    expect(authorizeStorageCleanup("Bearer fixture-cron-secret")).toBe(true)
    expect(authorizeStorageCleanup("Bearer wrong")).toBe(false)
    expect(authorizeStorageCleanup(null)).toBe(false)
    expect(oldEnoughForCleanup(object("recent", 0.5), now)).toBe(false)
    expect(oldEnoughForCleanup({ ...object("unknown"), updatedAt: null }, now)).toBe(false)
    expect(oldEnoughForCleanup(object("old", 2), now)).toBe(true)
    expect(oldEnoughForCleanup(object("staging", 23), now, true)).toBe(false)
  })
  it("deletes eligible objects through R2 and preserves current message references", async () => {
    for (const file of [object("guest/old.png"), object("guest/referenced.png"), object("guest/recent.png", 0.5)]) state.objects.set(file.path, file)
    state.referenced.mockImplementation(async (_name: string, args: { candidate_urls: string[] }) => ({
      data: args.candidate_urls.some(url => url.includes("referenced.png")), error: null,
    }))
    const report = await runStorageCleanup(false, true)
    expect(report).toMatchObject({ complete: true, deleted: 1 })
    expect(state.removed).toEqual(["r2:guest/old.png"])
    expect([...state.objects.keys()]).toEqual(["guest/referenced.png", "guest/recent.png"])
    expect(state.names).not.toContain("supabase")
  })
  it("resumes bounded pages without starting a new cleanup cycle", async () => {
    for (let index = 0; index < 35; index++) state.objects.set(`guest/${index}.png`, object(`guest/${index}.png`))
    expect(await runStorageCleanup(false, true)).toMatchObject({ complete: false, deleted: 20 })
    expect(await runStorageCleanup(false, false)).toMatchObject({ complete: true, deleted: 35 })
    expect(await runStorageCleanup(false, false)).toMatchObject({ idle: true })
  })
  it("preserves all files when reference checks fail or file changes are paused", async () => {
    state.objects.set("guest/file.png", object("guest/file.png"))
    state.referenced.mockResolvedValue({ data: null, error: { message: "Database unavailable" } })
    await expect(runStorageCleanup(false, true)).rejects.toThrow("Database unavailable")
    expect(state.removed).toHaveLength(0)
    vi.stubEnv("STORAGE_MIGRATION_PAUSED", "true")
    expect(await runStorageCleanup(false, false)).toMatchObject({ paused: true })
    expect(state.removed).toHaveLength(0)
  })
  it("compensates Supabase offsets for actual deletions in the current folder", () => {
    const cursor = Buffer.from(JSON.stringify({ folders: ["guest"], offset: 100 })).toString("base64url")
    const adjusted = adjustCleanupCursor("supabase", cursor, ["guest/a.png", "guest/b.png", "another/c.png"])
    expect(JSON.parse(Buffer.from(adjusted!, "base64url").toString("utf8")).offset).toBe(98)
    expect(adjustCleanupCursor("r2", "opaque-r2-cursor", ["guest/a.png"])).toBe("opaque-r2-cursor")
  })
})
