import { describe, expect, it } from "vitest"

import { formatBackupDuration, getBackupTransferTime } from "./formatBackupTransfer"

describe("backup transfer timing", () => {
  it("includes preparation time and estimates remaining transfer time from measured bytes", () => {
    expect(getBackupTransferTime(1000, null, 11500, 2000, 10000, 2)).toEqual({ elapsed: 10500, remaining: 4000 })
    expect(formatBackupDuration(10500)).toBe("00:00:10")
    expect(formatBackupDuration(3661000)).toBe("01:01:01")
  })
  it("keeps elapsed time fixed after completion and leaves unknown estimates empty", () => {
    expect(getBackupTransferTime(1000, 9000, 60000, 10000, 10000, 2)).toEqual({ elapsed: 8000, remaining: null })
    for (const speed of [null, 0, -1, NaN, Infinity])
      expect(getBackupTransferTime(1000, null, 2000, 0, 10000, speed).remaining).toBeNull()
    expect(getBackupTransferTime(1000, null, 2000, 10000, 10000, 2).remaining).toBeNull()
    expect(getBackupTransferTime(null, null, 2000, 0, 0, null).elapsed).toBe(0)
  })
})
