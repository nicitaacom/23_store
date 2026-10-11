import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { allowanceValues, normalizeR2Usage, selectStorageUsage } from "./usage"
import type { TR2Analytics } from "./usage"
import type { TStorageUsage } from "@/ts/storage"

const state = vi.hoisted(() => ({ get: vi.fn(), set: vi.fn(), capacity: vi.fn() }))
vi.mock("@/libs/supabase/supabaseAdmin", () => ({ default: { rpc: vi.fn() } }))
vi.mock("./state", () => ({ storageRedis: () => state }))
vi.mock("./capacity", () => ({ STORAGE_CAPACITY_BYTES: 10_000_000_000, selectStorageCapacity: state.capacity }))
vi.mock("./providers", () => ({ storageProvider: vi.fn() }))

const now = new Date("2026-10-11T12:00:00Z")
function analytics(): TR2Analytics {
  return { storage: [
    { dimensions: { bucketName: "files", datetime: "2026-10-11T10:00:00Z" }, max: { payloadSize: 100, metadataSize: 1, objectCount: 1 } },
    { dimensions: { bucketName: "files", datetime: "2026-10-11T11:00:00Z" }, max: { payloadSize: 200, metadataSize: 2, objectCount: 2 } },
    { dimensions: { bucketName: "unrelated-bucket", datetime: "2026-10-11T11:00:00Z" }, max: { payloadSize: 30, metadataSize: 1, objectCount: 1 } },
    { dimensions: { bucketName: "another-project", datetime: "2026-10-11T11:00:00Z" }, max: { payloadSize: 1000, metadataSize: 10, objectCount: 9 } },
  ], operations: [{ dimensions: { actionType: "PutObject" }, sum: { requests: 30 } }, { dimensions: { actionType: "GetObject" }, sum: { requests: 400 } }],
  bandwidth: [{ sum: { bytesDownload: 500 } }] }
}
beforeEach(() => {
  vi.stubEnv("R2_ACCOUNT_STANDARD_ONLY", "true")
  vi.stubEnv("CLOUDFLARE_R2_ANALYTICS_TOKEN", "")
  vi.stubEnv("STORAGE_PROVIDER", "supabase")
  state.get.mockReset(); state.set.mockReset()
  state.capacity.mockReset().mockRejectedValue(new Error("Provider unavailable"))
})
afterEach(() => vi.unstubAllEnvs())

describe("storage usage scope and allowances", () => {
  it("takes the latest sample per bucket and separates application from account", () => {
    const result = normalizeR2Usage(analytics(), ["files"], now)
    expect(result.r2Files.value).toBe(202)
    expect(result.r2Objects.value).toBe(2)
    expect(result.r2Allowance.value).toBe(1243)
    expect(result.r2ClassA.remaining).toBe(999970)
    expect(result.r2ClassB.remaining).toBe(9999600)
  })
  it.each([0, 8_000_000_000, 10_000_000_000, 11_000_000_000])("reports remaining and excess for %s bytes", bytes => {
    expect(allowanceValues(bytes, 10_000_000_000)).toEqual({ allowance: 10_000_000_000,
      remaining: Math.max(0, 10_000_000_000 - bytes), excess: Math.max(0, bytes - 10_000_000_000) })
  })
  it("keeps missing samples unavailable and old samples stale", () => {
    expect(normalizeR2Usage({ storage: [], operations: [], bandwidth: [] }, ["files"], now).r2Files.value).toBeNull()
    const data = analytics(); data.storage.forEach(sample => { sample.dimensions.datetime = "2026-10-01T00:00:00Z" })
    expect(normalizeR2Usage(data, ["files"], now).r2Files.status).toBe("stale")
  })
  it("does not assume included allowances for mixed storage classes or unknown operations", () => {
    vi.stubEnv("R2_ACCOUNT_STANDARD_ONLY", "false")
    const data = analytics()
    expect(normalizeR2Usage(data, ["files"], now).r2Allowance.value).toBeNull()
    expect(normalizeR2Usage(data, ["files"], now).r2ClassA.allowance).toBeNull()
    data.operations.push({ dimensions: { actionType: "NewOperation" }, sum: { requests: 1 } })
    expect(normalizeR2Usage(data, ["files"], now).r2ClassA.status).toBe("unavailable")
  })
  it("rejects invalid measurements and handles missing credentials without reporting zero", async () => {
    const data = analytics(); data.storage[0].max.payloadSize = -1
    expect(() => normalizeR2Usage(data, ["files"], now)).toThrow()
    vi.stubEnv("CLOUDFLARE_R2_ANALYTICS_TOKEN", ""); vi.stubEnv("STORAGE_PROVIDER", "supabase")
    expect((await selectStorageUsage()).metrics.r2Files.value).toBeNull()
  })
  it("retains the last successful capacity measurement when its provider fails", async () => {
    const observedAt = "2026-10-01T12:00:00Z"
    const previous: TStorageUsage = { provider: "supabase", refreshedAt: observedAt, metrics: {
      applicationLimit: { value: 8_000_000_000, unit: "bytes", source: "Stored inventory", scope: "Application", observedAt, status: "available" },
    } }
    state.get.mockResolvedValue(previous)
    const selectStorageUsageResp = await selectStorageUsage()
    expect(selectStorageUsageResp.metrics.applicationLimit).toMatchObject({ value: 8_000_000_000, observedAt, status: "stale" })
    expect(state.set).toHaveBeenCalledWith("storage:23:usage", selectStorageUsageResp)
  })
  it("does not show the old provider's capacity after a provider switch", async () => {
    const observedAt = new Date().toISOString()
    state.get.mockResolvedValue({ provider: "supabase", refreshedAt: observedAt, metrics: {
      applicationLimit: { value: 8_000_000_000, unit: "bytes", source: "Old provider", scope: "Application", observedAt, status: "available" },
    } } satisfies TStorageUsage)
    vi.stubEnv("STORAGE_PROVIDER", "r2")
    const selectStorageUsageResp = await selectStorageUsage()
    expect(selectStorageUsageResp.provider).toBe("r2")
    expect(selectStorageUsageResp.metrics.applicationLimit).toMatchObject({ value: null, status: "unavailable" })
  })
})
