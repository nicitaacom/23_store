import { describe, expect, it } from "vitest"

import { mapWithConcurrency } from "./mapWithConcurrency"

describe("mapWithConcurrency", () => {
  it("keeps input order with at most four active image requests", async () => {
    let active = 0
    let highestActive = 0
    const values = await mapWithConcurrency(Array.from({ length: 12 }, (_, index) => index), 4, async value => {
      active++
      highestActive = Math.max(highestActive, active)
      await new Promise(resolve => setTimeout(resolve, 1))
      active--
      return value * 2
    })

    expect(highestActive).toBe(4)
    expect(values).toEqual(Array.from({ length: 12 }, (_, index) => index * 2))
  })

  it("stops starting requests after the first failure", async () => {
    const attempted: number[] = []
    await expect(
      mapWithConcurrency([0, 1, 2, 3, 4, 5], 2, async value => {
        attempted.push(value)
        if (value === 0) throw new Error("image 1 failed")
        await new Promise(resolve => setTimeout(resolve, 1))
        return value
      }),
    ).rejects.toThrow("image 1 failed")
    expect(attempted).toEqual([0, 1])
  })
})
