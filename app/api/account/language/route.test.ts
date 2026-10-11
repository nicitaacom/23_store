import { beforeEach, describe, expect, it, vi } from "vitest"

import { POST } from "./route"
import supabaseAdmin from "@/libs/supabase/supabaseAdmin"
import { supabaseRouteHandler } from "@/libs/supabase/supabaseRouteHandler"

vi.mock("@/libs/supabase/supabaseRouteHandler", () => ({ supabaseRouteHandler: vi.fn() }))
vi.mock("@/libs/supabase/supabaseAdmin", () => ({ default: { from: vi.fn() } }))

const getUser = vi.fn()
const updateUser = vi.fn()
const matchUser = vi.fn()
const selectUser = vi.fn()
const selectSingleUser = vi.fn()

function createLanguageRequest(body: unknown) {
  return new Request("http://localhost:3023/api/account/language", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
}

describe("account language", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(supabaseRouteHandler).mockResolvedValue({ auth: { getUser } } as unknown as Awaited<ReturnType<typeof supabaseRouteHandler>>)
    getUser.mockResolvedValue({ data: { user: { id: "current-account" } }, error: null })
    vi.mocked(supabaseAdmin.from).mockReturnValue({ update: updateUser } as unknown as ReturnType<typeof supabaseAdmin.from>)
    updateUser.mockReturnValue({ eq: matchUser })
    matchUser.mockReturnValue({ select: selectUser })
    selectUser.mockReturnValue({ maybeSingle: selectSingleUser })
    selectSingleUser.mockResolvedValue({ data: { id: "current-account" }, error: null })
  })

  it.each(["fi", "en", "ru", "se"])("persists %s only for the verified account", async language => {
    const response = await POST(createLanguageRequest({ language, userId: "another-account", roles: ["ADMIN"] }))

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({ success: true })
    expect(supabaseAdmin.from).toHaveBeenCalledWith("23_users")
    expect(updateUser).toHaveBeenCalledWith({ preferred_language: language })
    expect(matchUser).toHaveBeenCalledWith("id", "current-account")
  })

  it("rejects an anonymous visitor without updating a profile", async () => {
    getUser.mockResolvedValue({ data: { user: null }, error: null })

    const response = await POST(createLanguageRequest({ language: "en" }))

    expect(response.status).toBe(401)
    expect(updateUser).not.toHaveBeenCalled()
  })

  it("rejects a session that fails verification", async () => {
    getUser.mockResolvedValue({ data: { user: { id: "unverified-account" } }, error: { message: "Expired token" } })

    const response = await POST(createLanguageRequest({ language: "en" }))

    expect(response.status).toBe(401)
    expect(updateUser).not.toHaveBeenCalled()
  })

  it.each([null, {}, { language: "de" }, { language: "EN" }, { language: "toString" }, { language: 1 }])(
    "rejects an unsupported or missing language: %j",
    async body => {
      const response = await POST(createLanguageRequest(body))

      expect(response.status).toBe(400)
      expect(updateUser).not.toHaveBeenCalled()
    },
  )

  it("rejects invalid JSON without updating a profile", async () => {
    const response = await POST(new Request("http://localhost:3023/api/account/language", { method: "POST", body: "{" }))

    expect(response.status).toBe(400)
    expect(updateUser).not.toHaveBeenCalled()
  })

  it("reports a database failure instead of a successful language change", async () => {
    selectSingleUser.mockResolvedValue({ data: null, error: { message: "Database unavailable" } })

    const response = await POST(createLanguageRequest({ language: "en" }))

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toEqual({ error: "Database unavailable" })
  })

  it("reports a missing profile instead of a successful language change", async () => {
    selectSingleUser.mockResolvedValue({ data: null, error: null })

    const response = await POST(createLanguageRequest({ language: "en" }))

    expect(response.status).toBe(404)
  })
})
