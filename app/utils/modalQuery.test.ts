import { describe, expect, it } from "vitest"

import { getUrlWithoutModal } from "./modalQuery"

describe("getUrlWithoutModal", () => {
  it("removes only the closed modal and keeps catalog filters", () => {
    expect(getUrlWithoutModal("https://jokik.fi/ru?query=tea&modal=AdminPanel&page=2", "AdminPanel"))
      .toBe("/ru?query=tea&page=2")
  })

  it("keeps another open modal", () => {
    expect(getUrlWithoutModal("https://jokik.fi/ru?modal=AdminPanel&modal=CartModal", "AdminPanel"))
      .toBe("/ru?modal=CartModal")
  })
})
