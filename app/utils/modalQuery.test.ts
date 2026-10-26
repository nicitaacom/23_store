import { afterEach, describe, expect, it, vi } from "vitest"

import { closeModalOnCurrentPage, getUrlWithoutModal, openModalOnCurrentPage } from "./modalQuery"

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

describe("closeModalOnCurrentPage", () => {
  it("removes the closed modal without a route request", () => {
    const replaceState = vi.fn()
    vi.stubGlobal("window", {
      location: { href: "https://jokik.fi/?modal=CartModal", pathname: "/", search: "?modal=CartModal", hash: "" },
      history: { state: { __NA: true }, replaceState },
    })

    closeModalOnCurrentPage("CartModal")

    expect(replaceState).toHaveBeenCalledWith(null, "", "/")
  })

  it("keeps catalog filters and a second open modal", () => {
    const replaceState = vi.fn()
    vi.stubGlobal("window", {
      location: {
        href: "https://jokik.fi/ru?query=tea&modal=CartModal&modal=AuthModal&page=2",
        pathname: "/ru",
        search: "?query=tea&modal=CartModal&modal=AuthModal&page=2",
        hash: "",
      },
      history: { replaceState },
    })

    closeModalOnCurrentPage("CartModal")

    expect(replaceState).toHaveBeenCalledWith(null, "", "/ru?query=tea&page=2&modal=AuthModal")
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
