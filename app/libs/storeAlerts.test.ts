import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({ eval: vi.fn(), send: vi.fn() }))

vi.mock("@upstash/redis", () => ({ Redis: { fromEnv: () => ({ eval: mocks.eval }) } }))
vi.mock("@/utils/sendTelegramMessage", () => ({ sendTelegramMessage: mocks.send }))

import { isSupabaseOutageStatus, reportErrorToast, reportSupabaseOutage } from "./storeAlerts"

describe("store alerts", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubEnv("VERCEL_ENV", "production")
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "https://example.test")
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "dummy")
    vi.stubEnv("TELEGRAM_BOT_TOKEN", "dummy")
    vi.stubEnv("TELEGRAM_CHAT_ID", "dummy")
  })

  afterEach(() => vi.unstubAllEnvs())

  it("classifies quota and connection failures as outages", () => {
    expect([0, 402, 429, 503].every(isSupabaseOutageStatus)).toBe(true)
    expect(isSupabaseOutageStatus(200)).toBe(false)
  })

  it("releases a failed Telegram claim so a later check can retry", async () => {
    mocks.eval.mockResolvedValueOnce(1).mockResolvedValueOnce(1)
    mocks.send.mockResolvedValueOnce({ ok: false, status: 503 })
    await reportSupabaseOutage(402)
    expect(mocks.send).toHaveBeenCalledWith(expect.stringContaining("Supabase usage restriction"), expect.any(AbortSignal))
    expect(mocks.eval).toHaveBeenCalledTimes(2)
    expect(mocks.eval.mock.calls[1][2][1]).toBe(0)
  })

  it("does not send a toast alert when Redis has not claimed one", async () => {
    mocks.eval.mockResolvedValueOnce(1).mockResolvedValueOnce(0)
    await reportErrorToast("fingerprint", "client")
    expect(mocks.send).not.toHaveBeenCalled()
  })
})
