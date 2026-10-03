import { afterEach, describe, expect, it, vi } from "vitest"

import { getUrlWithoutModal, openModalOnCurrentPage } from "./modalQuery"

afterEach(() => vi.unstubAllGlobals())

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

describe("openModalOnCurrentPage", () => {
  it("opens on the current URL without a route request and keeps filters", () => {
    const pushState = vi.fn()
    vi.stubGlobal("window", {
      location: { href: "https://jokik.fi/en?query=tea&page=2" },
      history: { state: { __NA: true }, pushState },
    })

    openModalOnCurrentPage("AdminPanel")

    expect(pushState).toHaveBeenCalledWith(null, "", "/en?query=tea&page=2&modal=AdminPanel")
  })
})
