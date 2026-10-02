import { describe, expect, it } from "vitest"

import { getProductProcessingPluralForm } from "./getProductProcessingPluralForm"

describe("getProductProcessingPluralForm", () => {
  it("uses all three Russian product forms", () => {
    expect([1, 2, 5, 11, 21, 22, 25].map(count => getProductProcessingPluralForm(count, "ru"))).toEqual([
      "one", "few", "other", "other", "one", "few", "other",
    ])
  })

  it("uses singular only for one in English, Finnish, and Swedish", () => {
    for (const locale of ["en", "fi", "se"] as const) {
      expect(getProductProcessingPluralForm(1, locale)).toBe("one")
      expect(getProductProcessingPluralForm(2, locale)).toBe("other")
    }
  })
})
