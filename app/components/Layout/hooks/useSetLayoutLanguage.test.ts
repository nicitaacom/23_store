import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { useSetLayoutLanguage } from "./useSetLayoutLanguage"
import { useCurrentLocale } from "@/locales/client"
import { TEMPORARY_LOCALE_OVERRIDE_SESSION_KEY } from "@/utils/locale"

vi.mock("react", () => ({ useEffect: (effect: () => void) => effect() }))
vi.mock("@/locales/client", () => ({ useCurrentLocale: vi.fn() }))

const replaceLocation = vi.fn()
const sessionPreferences = new Map<string, string>()

describe("account language restoration", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    sessionPreferences.clear()
    vi.mocked(useCurrentLocale).mockReturnValue("fi")
    vi.stubGlobal("window", {
      location: { pathname: "/fi/products/product-1", search: "?page=2", hash: "#reviews", replace: replaceLocation },
      sessionStorage: {
        getItem: (key: string) => sessionPreferences.get(key) ?? null,
        removeItem: (key: string) => sessionPreferences.delete(key),
      },
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

  it("honors the user's selected locale while the account update is pending or unavailable", () => {
    sessionPreferences.set(TEMPORARY_LOCALE_OVERRIDE_SESSION_KEY, "en")
    vi.mocked(useCurrentLocale).mockReturnValue("en")

    useSetLayoutLanguage("current-account", "fi")

    expect(replaceLocation).not.toHaveBeenCalled()
    expect(sessionPreferences.get(TEMPORARY_LOCALE_OVERRIDE_SESSION_KEY)).toBe("en")
  })

  it("removes the temporary preference after the account update is visible", () => {
    sessionPreferences.set(TEMPORARY_LOCALE_OVERRIDE_SESSION_KEY, "fi")
    useSetLayoutLanguage("current-account", "fi")
    expect(sessionPreferences.has(TEMPORARY_LOCALE_OVERRIDE_SESSION_KEY)).toBe(false)
  })

  it("clears the temporary account preference after logout", () => {
    sessionPreferences.set(TEMPORARY_LOCALE_OVERRIDE_SESSION_KEY, "en")
    useSetLayoutLanguage(null, "fi")
    expect(sessionPreferences.has(TEMPORARY_LOCALE_OVERRIDE_SESSION_KEY)).toBe(false)
    expect(replaceLocation).not.toHaveBeenCalled()
  })
})
