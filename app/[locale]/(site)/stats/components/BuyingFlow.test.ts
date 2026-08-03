import { describe, expect, it } from "vitest"

import { getBuyingFlowLeaks, getLargestLeakIndex } from "./BuyingFlow"

describe("buying-flow leak math", () => {
  it("selects the largest fall between neighbouring stages", () => {
    const leaks = getBuyingFlowLeaks([
      { visitors: 100 },
      { visitors: 80 },
      { visitors: 20 },
      { visitors: 15 },
      { visitors: 10 },
    ])

    expect(leaks).toEqual([0.2, 0.75, 0.25, 1 / 3])
    expect(getLargestLeakIndex(leaks)).toBe(1)
  })

  it("returns an em dash value when either stage has zero visitors", () => {
    const leaks = getBuyingFlowLeaks([{ visitors: 10 }, { visitors: 0 }, { visitors: 0 }])

    expect(leaks).toEqual([null, null])
    expect(getLargestLeakIndex(leaks)).toBe(-1)
  })
})
