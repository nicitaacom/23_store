import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { cancelStorageCapacity, reserveStorageCapacity, STORAGE_CAPACITY_BYTES } from "./capacity"
import { completeStorageUpload, prepareBackupStorageUploads, prepareStorageUpload, validateStorageUpload } from "./uploads"
import { isStoragePath, resolveStorageReference, STORAGE_BUCKETS, storagePublicUrl } from "./references"
import type { TStorageActor } from "./authorization"
import type { IStorageProvider, TStorageObject, TStorageUploadRequest, TStorageUploadSession } from "@/ts/storage"

const state = vi.hoisted(() => {
  const values = new Map<string, unknown>()
  const hashes = new Map<string, Record<string, string>>()
  return { values, hashes, provider: null as IStorageProvider | null,
    redis: {
      get: vi.fn(async (key: string) => values.get(key) ?? null),
      set: vi.fn(async (key: string, value: unknown, options?: { nx?: boolean }) => {
        if (options?.nx && values.has(key)) return null
        values.set(key, value); return "OK"
      }),
      del: vi.fn(async (key: string) => Number(values.delete(key))),
      eval: vi.fn(async (script: string, keys: string[], args: string[]) => {
        if (values.get(keys[0]) !== args[0]) return 0
        if (script.includes("expire")) return 1
        return Number(values.delete(keys[0]))
      }),
      hset: vi.fn(async (key: string, record: Record<string, string>) => { hashes.set(key, { ...hashes.get(key), ...record }); return 1 }),
      hgetall: vi.fn(async (key: string) => hashes.get(key) ?? null),
      hexists: vi.fn(async (key: string, field: string) => Number(Object.hasOwn(hashes.get(key) ?? {}, field))),
      hdel: vi.fn(async (key: string, field: string) => { const record = hashes.get(key); if (record) delete record[field]; return 1 }),
      lpush: vi.fn(async () => 1),
    },
  }
})
vi.mock("./state", () => ({ storageRedis: () => state.redis,
  uploadKey: (id: string) => `upload:${id}`,
  fileKey: ({ reference }: TStorageUploadSession) => `lock:${reference.provider}:${reference.bucket}/${reference.path}`,
  releaseFileLock: async (session: TStorageUploadSession, id: string) => {
    const key = `lock:${session.reference.provider}:${session.reference.bucket}/${session.reference.path}`
    if (state.values.get(key) === id) state.values.delete(key)
  },
}))
vi.mock("./authorization", () => ({
  StorageRequestError: class extends Error { status: number; constructor(message: string, status = 400) { super(message); this.status = status } },
  authorizedStorageFolder: vi.fn(async (actor: TStorageActor) => actor.guest ? actor.guestFolder : "verifiedowner"),
}))
vi.mock("./providers", () => ({ storageProvider: () => state.provider,
  listStorageObjects: async (provider: IStorageProvider, bucket: TStorageObject["bucket"], prefix: string) => (await provider.list(bucket, prefix)).objects,
}))

const actor: TStorageActor = { id: "verified-user", email: "owner@example.com", admin: false, guest: false, guestFolder: null }
const input: TStorageUploadRequest = { bucket: "23_avatar-images", filename: "avatar.png", contentType: "image/png", size: 8 }
const png = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10])
let files: Map<string, TStorageObject>

function installProvider(name: "supabase" | "r2"): IStorageProvider {
  const provider: IStorageProvider = {
    name,
    list: vi.fn(async (bucket, prefix = "") => ({ objects: [...files.values()].filter(file => file.bucket === bucket && file.path.startsWith(prefix)), cursor: null })),
    inspect: vi.fn(async (bucket, path, staging = false) => files.get(staging ? `staging/${path}` : `${bucket}/${path}`) ?? null),
    signUpload: vi.fn(async () => ({ signedUrl: "https://private.example/signed", headers: { "Content-Type": "image/png" }, formField: null })),
    signDownload: vi.fn(async () => "https://private.example/download"),
    readSample: vi.fn(async () => png),
    publish: vi.fn(async session => {
      const object = files.get(`staging/${session.stagePath}`)
      if (!object) throw new Error("Staged file missing")
      files.set(`${session.reference.bucket}/${session.reference.path}`, { ...object, ...session.reference })
    }),
    delete: vi.fn(async (bucket, path, staging = false) => { files.delete(staging ? `staging/${path}` : `${bucket}/${path}`) }),
    listStaging: vi.fn(async () => ({ objects: [], cursor: null })),
    publicUrl: (bucket, path) => storagePublicUrl(name, bucket, path),
    measureBytes: vi.fn(async () => [...files.values()].reduce((bytes, file) => bytes + file.size, 0)),
  }
  state.provider = provider
  return provider
}
function stage(id: string, overrides: Partial<TStorageObject> = {}) {
  const session = state.values.get(`upload:${id}`) as TStorageUploadSession
  files.set(`staging/${session.stagePath}`, { ...session.reference, path: session.stagePath, size: session.size,
    contentType: session.contentType, updatedAt: new Date().toISOString(), etag: "staged-etag", ...overrides })
}

beforeEach(() => {
  vi.useFakeTimers(); vi.setSystemTime(new Date("2026-10-11T12:00:00Z"))
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://source.example")
  vi.stubEnv("NEXT_PUBLIC_R2_PUBLIC_URL", "https://files.example")
  vi.stubEnv("STORAGE_MIGRATION_PAUSED", "false"); vi.stubEnv("STORAGE_PRIVATE_LOGICAL_BUCKETS", "")
  state.values.clear(); state.hashes.clear(); files = new Map(); vi.clearAllMocks()
})
afterEach(() => { vi.unstubAllEnvs(); vi.useRealTimers() })

describe("configured storage references", () => {
  it.each(STORAGE_BUCKETS)("round trips encoded names in %s through both providers", bucket => {
    for (const provider of ["supabase", "r2"] as const) {
      const path = `owner/product/файл ${"長".repeat(100)}.png`
      expect(resolveStorageReference(`${storagePublicUrl(provider, bucket, path)}?v=1`)).toEqual({ provider, bucket, path })
    }
  })
  it("preserves external URLs and rejects encoded separators and unsafe paths", () => {
    expect(resolveStorageReference("https://unconfigured.supabase.co/storage/v1/object/public/23_avatar-images/a.png")).toBeNull()
    expect(resolveStorageReference("https://files.example/23_avatar-images/owner%2Fother/file.png")).toBeNull()
    for (const path of ["../file", "/absolute", "a//b", "a\\b", "a/./b", "a\0b"]) expect(isStoragePath(path)).toBe(false)
  })
})

describe("ADMIN backup provider selection", () => {
  const admin = { ...actor, admin: true }
  beforeEach(() => { vi.stubEnv("STORAGE_PROVIDER", "supabase"); installProvider("r2") })
  it("allows an ADMIN to copy to R2 while live storage remains Supabase", async () => {
    const destinations = await prepareBackupStorageUploads(admin, [input], "r2")
    expect(destinations[0].reference.provider).toBe("r2")
    expect(process.env.STORAGE_PROVIDER).toBe("supabase")
  })
  it("rejects provider overrides outside ADMIN backup imports", async () => {
    await expect(prepareBackupStorageUploads(actor, [input], "r2")).rejects.toThrow("ADMIN role required")
    await expect(prepareStorageUpload(admin, input, false, "r2")).rejects.toThrow("Provider selection requires")
    expect(state.hashes.size).toBe(0)
  })
  it("validates every file before reserving storage and releases unsent signatures after failure", async () => {
    await expect(prepareBackupStorageUploads(admin, [input, { ...input, filename: "../invalid" }], "r2")).rejects.toThrow("Invalid bucket or filename")
    expect(state.values.size).toBe(0)
    vi.mocked(state.provider!.signUpload).mockResolvedValueOnce({ signedUrl: "https://staging.example/one", headers: {}, formField: null }).mockRejectedValueOnce(new Error("Signing unavailable"))
    await expect(prepareBackupStorageUploads(admin, [input, { ...input, filename: "second.png" }], "r2")).rejects.toThrow("Signing unavailable")
    expect([...state.values.keys()].filter(key => key.startsWith("upload:") || key.startsWith("lock:"))).toEqual([])
    expect([...state.hashes.values()].every(record => Object.keys(record).length === 0)).toBe(true)
  })
})

describe.each(["supabase", "r2"] as const)("%s upload workflow", name => {
  beforeEach(() => { vi.stubEnv("STORAGE_PROVIDER", name); installProvider(name) })
  it("publishes verified bytes, retains immutable staging and completes idempotently", async () => {
    const prepared = await prepareStorageUpload(actor, input); stage(prepared.uploadId)
    const completed = await completeStorageUpload(actor, prepared.uploadId)
    expect(completed.publicUrl).toContain(`?v=${prepared.uploadId}`)
    expect(files.has(`${input.bucket}/verifiedowner/avatar.png`)).toBe(true)
    expect([...files.keys()].some(key => key.startsWith("staging/"))).toBe(true)
    expect(await completeStorageUpload(actor, prepared.uploadId)).toEqual(completed)
    expect(state.provider?.publish).toHaveBeenCalledTimes(1)
  })
  it("rejects a forged folder and another caller's completion", async () => {
    await expect(prepareStorageUpload(actor, { ...input, folder: "victim" })).rejects.toMatchObject({ status: 403 })
    const prepared = await prepareStorageUpload(actor, input)
    await expect(completeStorageUpload({ ...actor, id: "victim" }, prepared.uploadId)).rejects.toMatchObject({ status: 403 })
    expect(state.provider?.publish).not.toHaveBeenCalled()
  })
  it("rejects expired completion and mismatched actual sizes before publication", async () => {
    const prepared = await prepareStorageUpload(actor, input); stage(prepared.uploadId, { size: 9 })
    await expect(completeStorageUpload(actor, prepared.uploadId)).rejects.toMatchObject({ status: 400 })
    expect(state.provider?.publish).not.toHaveBeenCalled()
    vi.advanceTimersByTime(301000)
    await expect(completeStorageUpload(actor, prepared.uploadId)).rejects.toMatchObject({ status: 410 })
  })
  it("rejects spoofed image bytes and unsupported MIME declarations", async () => {
    const prepared = await prepareStorageUpload(actor, input); stage(prepared.uploadId)
    vi.mocked(state.provider!.readSample).mockResolvedValue(new Uint8Array([1, 2, 3]))
    await expect(completeStorageUpload(actor, prepared.uploadId)).rejects.toMatchObject({ status: 400 })
    expect(files.has(`${input.bucket}/verifiedowner/avatar.png`)).toBe(false)
    expect(() => validateStorageUpload({ ...input, contentType: "image/svg+xml" })).toThrow()
    expect(() => validateStorageUpload({ ...input, size: 50 * 1024 ** 2 + 1 })).toThrow()
  })
  it("allocates distinct filenames for simultaneous pending uploads", async () => {
    const first = await prepareStorageUpload(actor, input)
    const second = await prepareStorageUpload(actor, input)
    expect(first.reference.path).toBe("verifiedowner/avatar.png")
    expect(second.reference.path).toBe("verifiedowner/avatar_1.png")
  })
  it("overwrites an avatar and returns a fresh delivery URL", async () => {
    files.set(`${input.bucket}/verifiedowner/avatar.png`, { provider: name, bucket: input.bucket, path: "verifiedowner/avatar.png",
      size: 3, contentType: "image/png", etag: "old", updatedAt: null })
    const prepared = await prepareStorageUpload(actor, { ...input, upsert: true }); stage(prepared.uploadId)
    await completeStorageUpload(actor, prepared.uploadId)
    expect(files.get(`${input.bucket}/verifiedowner/avatar.png`)?.size).toBe(8)
  })
})

describe("shared application capacity", () => {
  it("reserves outstanding uploads and rejects crossing 10 GB before signing", async () => {
    const provider = installProvider("r2")
    vi.mocked(provider.measureBytes).mockResolvedValue(STORAGE_CAPACITY_BYTES - 20)
    await reserveStorageCapacity(provider, "first", 12)
    await expect(reserveStorageCapacity(provider, "second", 12)).rejects.toMatchObject({ status: 413 })
    await cancelStorageCapacity(provider, "first")
    await reserveStorageCapacity(provider, "second", 12)
    expect(provider.signUpload).not.toHaveBeenCalled()
  })
  it("permits an exact boundary and blocks when inventory is unknown", async () => {
    const provider = installProvider("r2")
    vi.mocked(provider.measureBytes).mockResolvedValue(STORAGE_CAPACITY_BYTES - 16)
    await reserveStorageCapacity(provider, "boundary", 16)
    vi.mocked(provider.measureBytes).mockRejectedValue(new Error("Provider unavailable"))
    await expect(reserveStorageCapacity(provider, "unknown", 1)).rejects.toThrow("Provider unavailable")
  })
  it("releases an expired reservation after staging has been removed", async () => {
    const provider = installProvider("r2")
    await reserveStorageCapacity(provider, "abandoned", 16, "uploads/old/file.png")
    vi.advanceTimersByTime(27 * 60 * 60 * 1000)
    await reserveStorageCapacity(provider, "new", 16)
    expect(provider.inspect).toHaveBeenCalledWith("23_support-guest-images", "uploads/old/file.png", true)
    expect(provider.delete).not.toHaveBeenCalled()
    expect(Object.hasOwn(state.hashes.get("storage:23:capacity:r2:reservations") ?? {}, "abandoned")).toBe(false)
  })
  it("enforces the shared capacity for verified ADMIN backup uploads", async () => {
    const provider = installProvider("r2"); vi.stubEnv("STORAGE_PROVIDER", "r2")
    vi.mocked(provider.measureBytes).mockResolvedValue(STORAGE_CAPACITY_BYTES - 15)
    await expect(prepareStorageUpload({ ...actor, admin: true }, { ...input, filename: "owner/avatar.png", upsert: true }, true)).rejects.toMatchObject({ status: 413 })
    expect(provider.signUpload).not.toHaveBeenCalled()
  })
})
