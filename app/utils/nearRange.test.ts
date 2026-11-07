import { describe, expect, it } from "vitest"

import { RANGE_SIZE, nextPageStart, previousPageStart } from "./nearRange"

describe("paged range", () => {
  it("opens on the first 40", () => {
    expect(nextPageStart(0, 213)).toBe(RANGE_SIZE)
    expect(previousPageStart(0)).toBe(0)
  })

  it("moves a full page", () => {
    expect(nextPageStart(40, 213)).toBe(80)
    expect(previousPageStart(80)).toBe(40)
  })

  it("stops on the last page", () => {
    expect(nextPageStart(200, 213)).toBe(200)
    expect(previousPageStart(200)).toBe(160)
  })

  it("keeps a short list on the first page", () => {
    expect(nextPageStart(0, 8)).toBe(0)
  })
})
