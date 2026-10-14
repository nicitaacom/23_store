import { afterEach, describe, expect, it, vi } from "vitest"

import { accountSDK } from "./AccountSDK"

afterEach(() => vi.unstubAllGlobals())

describe("account language request", () => {
  it("keeps the preference update alive during full-page language navigation", async () => {
    const request = vi.fn().mockResolvedValue(new Response(JSON.stringify({ success: true }), { status: 200 }))
    vi.stubGlobal("window", {})
    vi.stubGlobal("fetch", request)

    await accountSDK.updateLanguage("en")

    expect(request).toHaveBeenCalledWith(
      "/api/account/language",
      expect.objectContaining({
        method: "POST",
        keepalive: true,
        body: JSON.stringify({ language: "en" }),
      }),
    )
  })
})
