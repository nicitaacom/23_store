import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { useSetLayoutLanguage } from "./useSetLayoutLanguage"
import { useCurrentLocale } from "@/locales/client"

vi.mock("react", () => ({ useEffect: (effect: () => void) => effect() }))
vi.mock("@/locales/client", () => ({ useCurrentLocale: vi.fn() }))

const replaceLocation = vi.fn()

describe("account language restoration", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(useCurrentLocale).mockReturnValue("fi")
    vi.stubGlobal("window", {
      location: { pathname: "/fi/products/product-1", search: "?page=2", hash: "#reviews", replace: replaceLocation },
    })
  })

  afterEach(() => vi.unstubAllGlobals())

  it("restores the account's English language after login without a browser cookie", () => {
    useSetLayoutLanguage("current-account", "en")

    expect(replaceLocation).toHaveBeenCalledWith("/en/products/product-1?page=2#reviews")
  })

  it("restores the account language when the address has no locale prefix", () => {
    window.location.pathname = "/products/product-1"

    useSetLayoutLanguage("current-account", "se")

    expect(replaceLocation).toHaveBeenCalledWith("/se/products/product-1?page=2#reviews")
  })

  it("keeps the current locale for an account without a preference", () => {
    useSetLayoutLanguage("current-account", null)

    expect(replaceLocation).not.toHaveBeenCalled()
  })

  it("keeps the anonymous visitor's current locale", () => {
    useSetLayoutLanguage(null, "en")

    expect(replaceLocation).not.toHaveBeenCalled()
  })

  it("keeps the page in place when the account language already matches", () => {
    useSetLayoutLanguage("current-account", "fi")

    expect(replaceLocation).not.toHaveBeenCalled()
  })
})
