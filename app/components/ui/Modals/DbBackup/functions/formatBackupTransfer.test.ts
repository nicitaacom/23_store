import { describe, expect, it } from "vitest"

import { formatBackupDuration, getBackupTransferTime } from "./formatBackupTransfer"

describe("backup transfer timing", () => {
  it("includes preparation and verification time instead of predicting from a brief speed spike", () => {
    expect(getBackupTransferTime(1000, null, 11500, 2000, 10000, 2)).toEqual({ elapsed: 10500, remaining: 42000 })
    expect(getBackupTransferTime(0, null, 1371000, 93, 100, 1000).remaining).toBe(104000)
    expect(formatBackupDuration(10500)).toBe("00:00:10")
    expect(formatBackupDuration(3661000)).toBe("01:01:01")
  })
  it("extends the progress estimate when current transfer speed drops", () => {
    expect(getBackupTransferTime(0, null, 10000, 5000, 10000, 0.1).remaining).toBe(50000)
    expect(getBackupTransferTime(0, null, 20000, 5000, 10000, 1).remaining).toBe(20000)
  })
  it("uses progress when speed is unknown, and speed before progress can be averaged", () => {
    expect(getBackupTransferTime(0, null, 10000, 5000, 10000, null).remaining).toBe(10000)
    expect(getBackupTransferTime(0, null, 0, 0, 10000, 1).remaining).toBe(10000)
    expect(getBackupTransferTime(0, null, 10000, 0, 10000, null).remaining).toBeNull()
  })
  it("shows zero when the current transfer rate is zero", () => {
    expect(getBackupTransferTime(0, null, 10000, 5000, 10000, 0).remaining).toBe(0)
    expect(formatBackupDuration(0)).toBe("00:00:00")
  })
  it("keeps elapsed time fixed after completion and leaves unknown estimates empty", () => {
    expect(getBackupTransferTime(1000, 9000, 60000, 10000, 10000, 2)).toEqual({ elapsed: 8000, remaining: null })
    for (const speed of [null, -1, NaN, Infinity])
      expect(getBackupTransferTime(1000, null, 2000, 0, 10000, speed).remaining).toBeNull()
    expect(getBackupTransferTime(1000, null, 2000, 10000, 10000, 2).remaining).toBeNull()
    expect(getBackupTransferTime(null, null, 2000, 0, 0, null).elapsed).toBe(0)
  })
})
