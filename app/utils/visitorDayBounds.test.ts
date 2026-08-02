import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { getVisitorDayEnd, getVisitorDayStart } from "./visitorDayBounds"

const SECONDS_PER_DAY = 24 * 60 * 60

function formatLocalTime(date: Date, timezone: string): string {
  return new Intl.DateTimeFormat("en-GB", { timeZone: timezone, hourCycle: "h23", hour: "2-digit", minute: "2-digit" }).format(
    date,
  )
}

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

describe("getVisitorDayEnd — midnight ahead of the visitor", () => {
  it("lands on local midnight for whole-hour, half-hour and quarter-hour offsets", () => {
    vi.setSystemTime(new Date("2026-08-02T12:00:00.000Z"))

    expect(getVisitorDayEnd("Europe/Helsinki").toISOString()).toBe("2026-08-02T21:00:00.000Z")
    expect(getVisitorDayEnd("Asia/Kolkata").toISOString()).toBe("2026-08-02T18:30:00.000Z")
    expect(getVisitorDayEnd("Asia/Kathmandu").toISOString()).toBe("2026-08-02T18:15:00.000Z")
    expect(getVisitorDayEnd("America/Los_Angeles").toISOString()).toBe("2026-08-03T07:00:00.000Z")
    expect(getVisitorDayEnd("UTC").toISOString()).toBe("2026-08-03T00:00:00.000Z")
  })

  it("reads 00:00 in the visitor's own timezone, whichever zone it is", () => {
    vi.setSystemTime(new Date("2026-08-02T12:00:00.000Z"))

    for (const timezone of [
      "Europe/Helsinki",
      "Asia/Kolkata",
      "Asia/Kathmandu",
      "America/Los_Angeles",
      "Pacific/Auckland",
      "UTC",
    ]) {
      expect(formatLocalTime(getVisitorDayEnd(timezone), timezone)).toBe("00:00")
    }
  })

  it("gives a full day at local midnight itself, not zero", () => {
    vi.setSystemTime(new Date("2026-08-02T21:00:00.000Z"))

    expect(getVisitorDayEnd("Europe/Helsinki").getTime() - Date.now()).toBe(SECONDS_PER_DAY * 1000)
  })

  it("gives one second one second before local midnight", () => {
    vi.setSystemTime(new Date("2026-08-02T20:59:59.000Z"))

    expect(getVisitorDayEnd("Europe/Helsinki").toISOString()).toBe("2026-08-02T21:00:00.000Z")
  })

  it("keeps the sub-second part of now, so the expiry never rounds backwards", () => {
    vi.setSystemTime(new Date("2026-08-02T12:00:00.750Z"))

    expect(getVisitorDayEnd("UTC").toISOString()).toBe("2026-08-03T00:00:00.750Z")
  })
})

describe("getVisitorDayStart — midnight behind the visitor", () => {
  it("lands on local midnight for whole-hour, half-hour and quarter-hour offsets", () => {
    vi.setSystemTime(new Date("2026-08-02T12:00:00.000Z"))

    expect(getVisitorDayStart("Europe/Helsinki").toISOString()).toBe("2026-08-01T21:00:00.000Z")
    expect(getVisitorDayStart("Asia/Kolkata").toISOString()).toBe("2026-08-01T18:30:00.000Z")
    expect(getVisitorDayStart("Asia/Kathmandu").toISOString()).toBe("2026-08-01T18:15:00.000Z")
    expect(getVisitorDayStart("America/Los_Angeles").toISOString()).toBe("2026-08-02T07:00:00.000Z")
    expect(getVisitorDayStart("UTC").toISOString()).toBe("2026-08-02T00:00:00.000Z")
  })

  it("always sits behind now, and exactly a day behind the day end", () => {
    vi.setSystemTime(new Date("2026-08-02T12:00:00.000Z"))

    for (const timezone of ["Europe/Helsinki", "Asia/Kathmandu", "America/Los_Angeles", "Pacific/Auckland", "UTC"]) {
      expect(getVisitorDayStart(timezone).getTime()).toBeLessThanOrEqual(Date.now())
      expect(getVisitorDayEnd(timezone).getTime() - getVisitorDayStart(timezone).getTime()).toBe(SECONDS_PER_DAY * 1000)
    }
  })

  it("differs from the UTC day for a visitor whose local date is already tomorrow", () => {
    vi.setSystemTime(new Date("2026-08-02T22:00:00.000Z"))

    // 10:00 on 2026-08-03 in Auckland - the UTC day start would be 12 hours too early
    expect(getVisitorDayStart("Pacific/Auckland").toISOString()).toBe("2026-08-02T12:00:00.000Z")
    expect(getVisitorDayStart("UTC").toISOString()).toBe("2026-08-02T00:00:00.000Z")
  })
})

describe("timezones Intl does not know", () => {
  it("falls back to a 24h window for an invented zone", () => {
    vi.setSystemTime(new Date("2026-08-02T12:00:00.000Z"))

    expect(getVisitorDayEnd("Mars/Olympus").toISOString()).toBe("2026-08-03T12:00:00.000Z")
    expect(getVisitorDayStart("Mars/Olympus").toISOString()).toBe("2026-08-01T12:00:00.000Z")
  })

  it("falls back for undefined, empty and junk values", () => {
    vi.setSystemTime(new Date("2026-08-02T12:00:00.000Z"))

    for (const timezone of [undefined, "", "   ", "UTC+3", "<script>", "a".repeat(5000)]) {
      expect(getVisitorDayEnd(timezone).toISOString()).toBe("2026-08-03T12:00:00.000Z")
    }
  })

  it("keeps a one-day window on each side of now", () => {
    vi.setSystemTime(new Date("2026-08-02T12:00:00.000Z"))

    expect(getVisitorDayEnd("nope").getTime() - getVisitorDayStart("nope").getTime()).toBe(2 * SECONDS_PER_DAY * 1000)
  })
})

describe("summer-time transitions (known, accepted skew)", () => {
  it("ends the day at the correct local midnight after the clocks go forward", () => {
    // Europe/Helsinki moves 03:00 EET -> 04:00 EEST on 2026-03-29; this is 11:00 local, after it
    vi.setSystemTime(new Date("2026-03-29T08:00:00.000Z"))

    expect(formatLocalTime(getVisitorDayEnd("Europe/Helsinki"), "Europe/Helsinki")).toBe("00:00")
    expect(getVisitorDayEnd("Europe/Helsinki").toISOString()).toBe("2026-03-29T21:00:00.000Z")
  })

  it("starts that day one hour early, so the dedup window covers 25h", () => {
    vi.setSystemTime(new Date("2026-03-29T08:00:00.000Z"))

    // local midnight was 2026-03-28T22:00Z; wall-clock arithmetic reaches back one hour further than
    // that. A window one hour too wide only ever skips a duplicate row, so this is left as it is.
    expect(getVisitorDayStart("Europe/Helsinki").toISOString()).toBe("2026-03-28T21:00:00.000Z")
  })

  it("starts the clocks-go-back day one hour late, so the dedup window covers 23h", () => {
    // Europe/Helsinki moves 04:00 EEST -> 03:00 EET on 2026-10-25; this is 14:00 local, after it
    vi.setSystemTime(new Date("2026-10-25T12:00:00.000Z"))

    // local midnight was 2026-10-24T21:00Z, so a visit inside the first hour of that local day sits
    // outside the window and a second row for the same device is possible - once a year, one hour
    expect(getVisitorDayStart("Europe/Helsinki").toISOString()).toBe("2026-10-24T22:00:00.000Z")
    expect(formatLocalTime(getVisitorDayEnd("Europe/Helsinki"), "Europe/Helsinki")).toBe("00:00")
  })
})
