import type { MouseEvent } from "react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { useLanguageDropdownHandlers } from "./useLanguageDropdownHandlers"
import { accountSDK } from "@/sdk/AccountSDK/AccountSDK"
import useUser from "@/store/user/useUser"
import { TEMPORARY_LOCALE_OVERRIDE_SESSION_KEY } from "@/utils/locale"

vi.mock("react", () => ({ useState: () => [false, vi.fn()] }))
vi.mock("@/sdk/AccountSDK/AccountSDK", () => ({ accountSDK: { updateLanguage: vi.fn() } }))
vi.mock("@/store/user/useUser", () => ({ default: { getState: vi.fn() } }))

const assignLocation = vi.fn()
const setSessionPreference = vi.fn()
const preventDefault = vi.fn()
const event = {
  currentTarget: { href: "http://localhost:3023/en/products/product-1?query=coffee#reviews" },
  preventDefault,
} as unknown as MouseEvent<HTMLAnchorElement>

describe("language selection during a database outage", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(console, "error").mockImplementation(() => {})
    vi.stubGlobal("window", { location: { assign: assignLocation }, sessionStorage: { setItem: setSessionPreference } })
    vi.mocked(useUser.getState).mockReturnValue({ user: { id: "account-1" } } as ReturnType<typeof useUser.getState>)
    vi.mocked(accountSDK.updateLanguage).mockResolvedValue()
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it("navigates immediately while updating the account preference", () => {
    vi.mocked(accountSDK.updateLanguage).mockReturnValue(new Promise(() => {}))
    useLanguageDropdownHandlers().handleChangeLanguage(event, "en")
    expect(assignLocation).toHaveBeenCalledWith(event.currentTarget.href)
    expect(accountSDK.updateLanguage).toHaveBeenCalledWith("en")
    expect(setSessionPreference).toHaveBeenCalledWith(TEMPORARY_LOCALE_OVERRIDE_SESSION_KEY, "en")
  })

  it("keeps navigation available when the account service rejects the update", async () => {
    vi.mocked(accountSDK.updateLanguage).mockRejectedValue(new Error("no available server"))
    useLanguageDropdownHandlers().handleChangeLanguage(event, "en")
    await Promise.resolve()
    expect(assignLocation).toHaveBeenCalledWith(event.currentTarget.href)
    expect(console.error).toHaveBeenCalled()
  })

  it("navigates anonymous visitors without an account request", () => {
    vi.mocked(useUser.getState).mockReturnValue({ user: null } as ReturnType<typeof useUser.getState>)
    useLanguageDropdownHandlers().handleChangeLanguage(event, "en")
    expect(assignLocation).toHaveBeenCalledWith(event.currentTarget.href)
    expect(accountSDK.updateLanguage).not.toHaveBeenCalled()
  })

  it("still navigates when browser session storage is blocked", () => {
    setSessionPreference.mockImplementationOnce(() => {
      throw new Error("Storage blocked")
    })
    useLanguageDropdownHandlers().handleChangeLanguage(event, "en")
    expect(assignLocation).toHaveBeenCalledWith(event.currentTarget.href)
  })
})
