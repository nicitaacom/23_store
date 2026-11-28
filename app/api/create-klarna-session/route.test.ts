import { afterEach, describe, expect, it, vi } from "vitest"

import { POST } from "./route"

describe("direct Klarna session route", () => {
  afterEach(() => vi.restoreAllMocks())

  it("stays unavailable without contacting Klarna until direct setup is complete", async () => {
    const outboundRequest = vi.spyOn(globalThis, "fetch")

    const response = await POST()

    expect(response.status).toBe(503)
    expect(await response.json()).toEqual({ error: "Direct Klarna checkout is not configured." })
    expect(outboundRequest).not.toHaveBeenCalled()
  })
})
