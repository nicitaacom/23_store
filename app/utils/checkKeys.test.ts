import { afterEach, describe, expect, it, vi } from "vitest"

import { daysSince, REALERT_AFTER_DAYS, runKeyChecks, shouldSendKeyAlert } from "@/utils/checkKeys"

function isoDaysAgo(days: number): string {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()
}

/**
 * The rules that decide whether the weekly run breaks its silence. They are the reason a revoked key
 * does not send a message every single week, so they get real cases rather than a read-through.
 */
describe("shouldSendKeyAlert", () => {
  it("sends when nothing was ever reported", () => {
    expect(shouldSendKeyAlert(["OPENAI_API_KEY"], null)).toBe(true)
  })

  it("stays quiet for the same one name reported yesterday", () => {
    const lastAlert = { names: ["OPENAI_API_KEY"], sentAt: isoDaysAgo(1) }
    expect(shouldSendKeyAlert(["OPENAI_API_KEY"], lastAlert)).toBe(false)
  })

  it("stays quiet when the same set comes back in a different order", () => {
    const lastAlert = { names: ["OPENAI_API_KEY", "TELEGRAM_BOT_TOKEN"], sentAt: isoDaysAgo(2) }
    expect(shouldSendKeyAlert(["TELEGRAM_BOT_TOKEN", "OPENAI_API_KEY"], lastAlert)).toBe(false)
  })

  it("sends the moment a new name joins the same failure", () => {
    const lastAlert = { names: ["OPENAI_API_KEY"], sentAt: isoDaysAgo(1) }
    expect(shouldSendKeyAlert(["OPENAI_API_KEY", "TELEGRAM_BOT_TOKEN"], lastAlert)).toBe(true)
  })

  it("sends when a name drops out, because the picture changed", () => {
    const lastAlert = { names: ["OPENAI_API_KEY", "TELEGRAM_BOT_TOKEN"], sentAt: isoDaysAgo(1) }
    expect(shouldSendKeyAlert(["OPENAI_API_KEY"], lastAlert)).toBe(true)
  })

  it("stays quiet on the last day before the reminder is due", () => {
    const lastAlert = { names: ["OPENAI_API_KEY"], sentAt: isoDaysAgo(REALERT_AFTER_DAYS - 1) }
    expect(shouldSendKeyAlert(["OPENAI_API_KEY"], lastAlert)).toBe(false)
  })

  it("reminds once REALERT_AFTER_DAYS has passed on an unfixed name", () => {
    const lastAlert = { names: ["OPENAI_API_KEY"], sentAt: isoDaysAgo(REALERT_AFTER_DAYS + 1) }
    expect(shouldSendKeyAlert(["OPENAI_API_KEY"], lastAlert)).toBe(true)
  })

  it("sends when the stored timestamp is not a date, rather than staying quiet forever", () => {
    const lastAlert = { names: ["OPENAI_API_KEY"], sentAt: "not-a-date" }
    expect(shouldSendKeyAlert(["OPENAI_API_KEY"], lastAlert)).toBe(true)
  })
})

describe("daysSince", () => {
  it("answers null for an absent or unreadable timestamp", () => {
    expect(daysSince(null)).toBe(null)
    expect(daysSince(undefined)).toBe(null)
    expect(daysSince("")).toBe(null)
    expect(daysSince("whenever")).toBe(null)
  })

  it("counts whole and part days", () => {
    expect(daysSince(isoDaysAgo(3))).toBeCloseTo(3, 1)
    expect(daysSince(isoDaysAgo(0.5))).toBeCloseTo(0.5, 1)
  })
})

describe("runKeyChecks presence", () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it("fails an empty name before sending any request", async () => {
    vi.stubEnv("MADE_UP_KEY_NAME", "")
    const report = await runKeyChecks([{ name: "MADE_UP_KEY_NAME", tier: "skip" }])

    expect(report.ok).toBe(false)
    expect(report.failures).toEqual([{ name: "MADE_UP_KEY_NAME", reason: "is not defined or empty", tier: "skip" }])
  })

  it("passes a present name whose tier asks for nothing more", async () => {
    vi.stubEnv("MADE_UP_KEY_NAME", "anything")
    const report = await runKeyChecks([{ name: "MADE_UP_KEY_NAME", tier: "skip" }])

    expect(report.ok).toBe(true)
    expect(report.skipCount).toBe(1)
  })

  it("lets an empty value pass while its optionalWhen partner holds one", async () => {
    vi.stubEnv("MADE_UP_HOST", "")
    vi.stubEnv("MADE_UP_FALLBACK", "https://example.test")
    const report = await runKeyChecks([{ name: "MADE_UP_HOST", tier: "skip", optionalWhen: "MADE_UP_FALLBACK" }])

    expect(report.ok).toBe(true)
  })

  it("fails when both halves of an optionalWhen pair are empty", async () => {
    vi.stubEnv("MADE_UP_HOST", "")
    vi.stubEnv("MADE_UP_FALLBACK", "")
    const report = await runKeyChecks([{ name: "MADE_UP_HOST", tier: "skip", optionalWhen: "MADE_UP_FALLBACK" }])

    expect(report.ok).toBe(false)
    expect(report.failures[0].reason).toContain("MADE_UP_FALLBACK")
  })

  it("never runs the check when the value is empty", async () => {
    vi.stubEnv("MADE_UP_KEY_NAME", "")
    const check = vi.fn().mockResolvedValue(null)
    await runKeyChecks([{ name: "MADE_UP_KEY_NAME", tier: "live", check }])

    expect(check).not.toHaveBeenCalled()
  })
})
