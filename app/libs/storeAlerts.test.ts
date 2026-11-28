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

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.restoreAllMocks()
  })

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

  it("retains the daily claim lease when Redis fails to record a successful Telegram send", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {})
    mocks.eval.mockResolvedValueOnce(1).mockRejectedValueOnce(new Error("redis unavailable"))
    mocks.send.mockResolvedValueOnce({ ok: true, status: 200 })

    await reportSupabaseOutage(402)

    expect(mocks.eval.mock.calls[0][2][4]).toBe(86_400)
    expect(errorSpy).toHaveBeenCalledWith("[store-alerts] Could not finalize the Telegram alert claim", "Error")
    expect(mocks.send).toHaveBeenCalledTimes(1)
  })

  it("logs a safe error name when Telegram transport fails and releases the claim", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {})
    mocks.eval.mockResolvedValueOnce(1).mockResolvedValueOnce(1)
    mocks.send.mockRejectedValueOnce(new Error("request timed out"))

    await reportSupabaseOutage(402)

    expect(errorSpy).toHaveBeenCalledWith("[store-alerts] Telegram request failed", "Error")
    expect(mocks.eval).toHaveBeenCalledTimes(2)
    expect(mocks.eval.mock.calls[1][2][1]).toBe(0)
  })

  it("does not send a toast alert when Redis has not claimed one", async () => {
    mocks.eval.mockResolvedValueOnce(1).mockResolvedValueOnce(0)
    await reportErrorToast("fingerprint", "client")
    expect(mocks.send).not.toHaveBeenCalled()
  })

  it("sends the toast alert when the tenth matching error claims the daily alert", async () => {
    mocks.eval.mockResolvedValueOnce(1).mockResolvedValueOnce(10).mockResolvedValueOnce(1)
    mocks.send.mockResolvedValueOnce({ ok: true, status: 200 })

    await reportErrorToast("fingerprint", "client")

    expect(mocks.eval.mock.calls[1][2][0]).toBe(10)
    expect(mocks.eval.mock.calls[1][2][3]).toBe(3)
    expect(mocks.send).toHaveBeenCalledWith(expect.stringContaining("10 matching error notifications today."), expect.any(AbortSignal))
  })

  it("stops counting a client after its per-minute limit", async () => {
    mocks.eval.mockResolvedValueOnce(31)

    await reportErrorToast("fingerprint", "client")

    expect(mocks.eval).toHaveBeenCalledTimes(1)
    expect(mocks.send).not.toHaveBeenCalled()
  })

  it("does not send when Redis fails before a Supabase incident is claimed", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {})
    mocks.eval.mockRejectedValueOnce(new Error("redis unavailable"))

    await reportSupabaseOutage(402)

    expect(errorSpy).toHaveBeenCalledWith("[store-alerts] Could not record the Supabase incident")
    expect(mocks.send).not.toHaveBeenCalled()
  })
})
