import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { allowanceValues, selectStorageUsage, summarizeR2Inventory } from "./usage"
import type { TStorageUsage } from "@/ts/storage"

const state = vi.hoisted(() => ({ get: vi.fn(), set: vi.fn(), capacity: vi.fn() }))
vi.mock("@/libs/supabase/supabaseAdmin", () => ({ default: { rpc: vi.fn() } }))
vi.mock("./state", () => ({ storageRedis: () => state }))
vi.mock("./capacity", () => ({ STORAGE_CAPACITY_BYTES: 10_000_000_000, selectStorageCapacity: state.capacity }))
vi.mock("./providers", () => ({ storageProvider: vi.fn() }))

const now = new Date("2026-10-11T12:00:00Z")
beforeEach(() => {
  vi.stubEnv("R2_ACCOUNT_STANDARD_ONLY", "true")
  vi.stubEnv("CLOUDFLARE_R2_ANALYTICS_TOKEN", "")
  vi.stubEnv("STORAGE_PROVIDER", "supabase")
  state.get.mockReset(); state.set.mockReset()
  state.capacity.mockReset().mockRejectedValue(new Error("Provider unavailable"))
})
afterEach(() => vi.unstubAllEnvs())

describe("storage usage scope and allowances", () => {
  it("reports the configured bucket inventory and leaves request totals unknown", () => {
    const result = summarizeR2Inventory(202, 2, true, now)
    expect(result.r2Files.value).toBe(202)
    expect(result.r2Objects.value).toBe(2)
    expect(result.r2Allowance.value).toBe(202)
    expect(result.r2Allowance.remaining).toBe(10 * 1000 ** 3 - 202)
    expect(result.r2ClassA.value).toBeNull()
    expect(result.r2ClassB.value).toBeNull()
    expect(result.r2Bandwidth.value).toBeNull()
  })
  it.each([0, 8_000_000_000, 10_000_000_000, 11_000_000_000])("reports remaining and excess for %s bytes", bytes => {
    expect(allowanceValues(bytes, 10_000_000_000)).toEqual({ allowance: 10_000_000_000,
      remaining: Math.max(0, 10_000_000_000 - bytes), excess: Math.max(0, bytes - 10_000_000_000) })
  })
  it("does not assume an included allowance until every account bucket is confirmed", () => {
    const result = summarizeR2Inventory(202, 2, false, now)
    expect(result.r2Allowance.value).toBeNull()
    expect(result.r2Files.value).toBe(202)
  })
  it("rejects invalid measurements and leaves R2 empty when that provider is inactive", async () => {
    expect(() => summarizeR2Inventory(-1, 1, true, now)).toThrow()
    vi.stubEnv("STORAGE_PROVIDER", "supabase")
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
