import { NextRequest, NextResponse } from "next/server"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({ getUser: vi.fn(), maybeSingle: vi.fn(), retrieve: vi.fn(), requireAdmin: vi.fn(), selectUsage: vi.fn() }))
vi.mock("@/libs/supabase/supabaseRouteHandler", () => ({ supabaseRouteHandler: async () => ({ auth: { getUser: mocks.getUser },
  from: () => ({ select: () => ({ eq: () => ({ maybeSingle: mocks.maybeSingle }) }) }),
}) }))
vi.mock("@/libs/stripe", () => ({ stripe: { products: { retrieve: mocks.retrieve } } }))
vi.mock("@/api/backup/requireAdmin", () => ({ requireAdmin: mocks.requireAdmin }))
vi.mock("./usage", () => ({ selectStorageUsage: mocks.selectUsage }))
import { authorizedStorageFolder, authorizeStoragePath, checkStorageOrigin, setStorageVisitorCookie, verifyStorageActor } from "./authorization"
import type { TStorageActor } from "./authorization"
import { GET } from "@/api/storage/usage/route"

const actor: TStorageActor = { id: "creator", email: "creator@example.com", guest: false, guestFolder: null, admin: false }
beforeEach(() => {
  vi.stubEnv("DEVICE_ID_ENCRYPTION_KEY", "a".repeat(64)); vi.clearAllMocks()
  mocks.getUser.mockResolvedValue({ data: { user: { id: actor.id, email: actor.email, user_metadata: { roles: ["ADMIN"] } } }, error: null })
  mocks.maybeSingle.mockResolvedValue({ data: { roles: ["USER"] }, error: null })
})
afterEach(() => vi.unstubAllEnvs())

describe("verified file authorization", () => {
  it("derives ADMIN only from the database, ignoring user-editable auth metadata", async () => {
    expect((await verifyStorageActor(new NextRequest("https://shop.example/api/storage/prepare"))).admin).toBe(false)
    mocks.maybeSingle.mockResolvedValue({ data: { roles: ["ADMIN"] }, error: null })
    expect((await verifyStorageActor(new NextRequest("https://shop.example/api/storage/prepare"))).admin).toBe(true)
  })
  it("requires the product's owner and binds product drafts to their verified creator", async () => {
    mocks.maybeSingle.mockResolvedValue({ data: { id: "prod_1", owner_id: "someone-else" }, error: null })
    await expect(authorizedStorageFolder(actor, "23_product-images", "prod_1")).rejects.toMatchObject({ status: 403 })
    mocks.maybeSingle.mockResolvedValue({ data: null, error: null })
    mocks.retrieve.mockResolvedValue({ metadata: { storage_owner_id: "someone-else" } })
    await expect(authorizedStorageFolder(actor, "23_product-images", "prod_1")).rejects.toMatchObject({ status: 403 })
    mocks.retrieve.mockResolvedValue({ metadata: { storage_owner_id: "creator" } })
    expect(await authorizedStorageFolder(actor, "23_product-images", "prod_1")).toBe("creatorexamplecom/prod_1")
  })
  it("allows buyer-owned personalization for an existing product and rejects unknown products", async () => {
    mocks.maybeSingle.mockResolvedValue({ data: { id: "prod_1", owner_id: "seller" }, error: null })
    expect(await authorizedStorageFolder(actor, "23_product-personalization-images", "prod_1")).toBe("creatorexamplecom/prod_1")
    mocks.maybeSingle.mockResolvedValue({ data: null, error: null })
    await expect(authorizedStorageFolder(actor, "23_product-personalization-images", "prod_1")).rejects.toMatchObject({ status: 404 })
  })
  it("rejects forged folders, nested paths and cross-origin changes", async () => {
    await expect(authorizeStoragePath(actor, "23_avatar-images", "victim/avatar.png")).rejects.toMatchObject({ status: 403 })
    await expect(authorizeStoragePath(actor, "23_avatar-images", "creatorexamplecom/other/file.png")).rejects.toMatchObject({ status: 403 })
    expect(() => checkStorageOrigin(new NextRequest("https://shop.example/api/storage/prepare", { headers: { origin: "https://evil.example" } }))).toThrow()
  })
  it("mints a signed visitor cookie and rejects a changed cookie on completion", async () => {
    mocks.getUser.mockResolvedValue({ data: { user: null }, error: null })
    const visitor = await verifyStorageActor(new NextRequest("https://shop.example/api/storage/prepare"), true)
    const response = setStorageVisitorCookie(NextResponse.json({}), visitor)
    const cookie = response.cookies.get("23_did")?.value
    expect(cookie).toBeTruthy()
    expect(response.headers.get("set-cookie")).toContain("HttpOnly")
    const verified = await verifyStorageActor(new NextRequest("https://shop.example/api/storage/complete", { headers: { cookie: `23_did=${cookie}` } }))
    expect(verified.id).toBe(visitor.id)
    await expect(verifyStorageActor(new NextRequest("https://shop.example/api/storage/complete", { headers: { cookie: `23_did=${cookie}tampered` } }))).rejects.toMatchObject({ status: 401 })
  })
  it.each(["Unauthorized", "Forbidden: admin only"])("protects usage from %s callers before accessing provider metrics", async error => {
    mocks.requireAdmin.mockResolvedValue(error)
    const response = await GET()
    expect(response.status).toBe(error === "Unauthorized" ? 401 : 403)
    expect(mocks.selectUsage).not.toHaveBeenCalled()
  })
})
