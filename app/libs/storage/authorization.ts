import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

import type { TBuckets } from "@/ts/types/TBuckets"
import { isStorageBucket, isStoragePath } from "./references"
import { StorageRequestError } from "./errors"
import { createDeviceId, encodeDeviceId, isValidDeviceId } from "@/utils/deviceId"
import { decryptDeviceId, DEVICE_ID_COOKIE_NAME, encryptDeviceId } from "@/utils/deviceIdCookie"
import { slugifyEmail } from "@/utils/slugify"
import { stripe } from "@/libs/stripe"
import { supabaseRouteHandler } from "@/libs/supabase/supabaseRouteHandler"

export { StorageRequestError } from "./errors"

export type TStorageActor = { id: string; email: string | null; admin: boolean; guest: boolean; guestFolder: string | null; cookie?: string; accessToken?: string }

export function storageFailure(error: unknown) {
  return NextResponse.json({ error: error instanceof Error ? error.message : "Storage request failed" },
    { status: error instanceof StorageRequestError ? error.status : error instanceof SyntaxError ? 400 : 503 })
}

export function checkStorageOrigin(request: NextRequest) {
  const origin = request.headers.get("origin")
  if (origin && origin !== request.nextUrl.origin) throw new StorageRequestError("Forbidden origin", 403)
}

export async function verifyStorageActor(request: NextRequest, allowNewGuest = false): Promise<TStorageActor> {
  const supabase = await supabaseRouteHandler()
  const { data: { user: cookieUser }, error: authError } = await supabase.auth.getUser()
  let user = cookieUser
  let bearerSupabase: ReturnType<typeof createClient> | null = null
  if (user && authError) throw new StorageRequestError("Unauthorized", 401)
  const bearerToken = request.headers.get("authorization")?.match(/^Bearer\s+(.+)$/i)?.[1]
  if (!user && bearerToken) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if (!supabaseUrl || !anonKey) throw new StorageRequestError("Storage authentication is unavailable", 503)
    bearerSupabase = createClient(supabaseUrl, anonKey, { auth: { autoRefreshToken: false, persistSession: false } })
    const { data, error } = await bearerSupabase.auth.getUser(bearerToken)
    if (error || !data.user) throw new StorageRequestError("Unauthorized", 401)
    user = data.user
  }
  if (user) {
    const actorSupabase = bearerSupabase ?? supabase
    const { data: profile, error } = await actorSupabase.from("23_users").select("roles").eq("id", user.id).maybeSingle()
    if (error) throw new Error(error.message)
    return { id: user.id, email: user.email ?? null, admin: profile?.roles?.includes("ADMIN") ?? false,
      guest: false, guestFolder: null, ...(bearerToken && bearerSupabase ? { accessToken: bearerToken } : {}) }
  }
  const currentId = decryptDeviceId(request.cookies.get(DEVICE_ID_COOKIE_NAME)?.value)
  const deviceId = currentId && isValidDeviceId(currentId) ? currentId : allowNewGuest ? createDeviceId() : null
  if (!deviceId) throw new StorageRequestError("Verified visitor identity is required", 401)
  return { id: `guest:${deviceId}`, email: null, admin: false, guest: true, guestFolder: encodeDeviceId(deviceId),
    ...(deviceId !== currentId ? { cookie: encryptDeviceId(deviceId) } : {}) }
}

export function setStorageVisitorCookie(response: NextResponse, actor: TStorageActor) {
  if (actor.cookie) response.cookies.set(DEVICE_ID_COOKIE_NAME, actor.cookie, {
    httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 365,
  })
  return response
}

export async function authorizedStorageFolder(actor: TStorageActor, bucket: TBuckets, entityId?: string): Promise<string> {
  if (!isStorageBucket(bucket)) throw new StorageRequestError("Unsupported storage bucket")
  if (bucket === "23_support-guest-images") {
    if (!actor.guest || !actor.guestFolder) throw new StorageRequestError("Guest file identity required", 403)
    return actor.guestFolder
  }
  if (actor.guest || !actor.email) throw new StorageRequestError("Sign in to upload files", 401)
  const folder = slugifyEmail(actor.email)
  if (bucket !== "23_product-images" && bucket !== "23_product-personalization-images") return folder
  if (!entityId || !/^[a-zA-Z0-9_-]{1,160}$/.test(entityId)) throw new StorageRequestError("A valid product id is required")
  const supabase = actor.accessToken
    ? createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
        auth: { autoRefreshToken: false, persistSession: false },
        global: { headers: { authorization: `Bearer ${actor.accessToken}` } },
      })
    : await supabaseRouteHandler()
  const { data: product, error } = await supabase.from("23_products").select("id, owner_id").eq("id", entityId).maybeSingle()
  if (error) throw new Error(error.message)
  if (bucket === "23_product-personalization-images") {
    if (!product) throw new StorageRequestError("Product not found", 404)
  } else if (product) {
    if (product.owner_id !== actor.id) throw new StorageRequestError("Product owner required", 403)
  } else {
    // Stripe creates product ids before the Supabase product INSERT. Metadata binds that draft to its verified creator.
    const draft = await stripe.products.retrieve(entityId)
    if (draft.deleted || draft.metadata.storage_owner_id !== actor.id) throw new StorageRequestError("Authorized product draft required", 403)
  }
  return `${folder}/${entityId}`
}

export async function authorizeStoragePath(actor: TStorageActor, bucket: TBuckets, path: string): Promise<void> {
  if (!isStoragePath(path)) throw new StorageRequestError("Invalid storage path")
  if (actor.admin) return
  const parts = path.split("/")
  const folder = await authorizedStorageFolder(actor, bucket,
    bucket === "23_product-images" || bucket === "23_product-personalization-images" ? parts[1] : undefined)
  if (!path.startsWith(`${folder}/`) || path.slice(folder.length + 1).includes("/"))
    throw new StorageRequestError("Forbidden storage path", 403)
}
