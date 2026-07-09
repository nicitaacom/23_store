import { User } from "@supabase/supabase-js"

import { TRecordCartProduct } from "@/ts/product/TRecordCartProduct"
import supabaseAdmin from "@/libs/supabase/supabaseAdmin"
import { Json } from "@/ts/types_db"
import { getPreferredAvatarUrl, getUserAvatarUrl, getUserName, sanitizeAvatarUrl } from "@/utils/user"

interface SyncPublicUserOptions {
  provider?: string | null
}

interface SyncPublicUserResult {
  avatarUrl: string | null
  publicUserId: string
  roles: string[]
  username: string
}

export function normalizeAuthEmail(email: string | null | undefined): string {
  return typeof email === "string" ? email.trim().toLowerCase() : ""
}

function mergeRoles(roleLists: Array<string[] | null | undefined>): string[] {
  return Array.from(new Set(roleLists.flatMap(list => list ?? []).filter(Boolean)))
}

function getFirstNonEmptyString(values: Array<string | null | undefined>): string {
  return values.find(value => typeof value === "string" && value.trim().length > 0)?.trim() || ""
}

function mergeProviders(...providerLists: Array<string[] | null | undefined>): string[] | null {
  const mergedProviders = Array.from(
    new Set(
      providerLists
        .flatMap(providerList => providerList || [])
        .map(provider => provider.trim())
        .filter(Boolean),
    ),
  )

  return mergedProviders.length > 0 ? mergedProviders : null
}

function toCartRecord(cartProducts: Json | null | undefined): TRecordCartProduct {
  if (!cartProducts || typeof cartProducts !== "object" || Array.isArray(cartProducts)) {
    return {}
  }

  return cartProducts as unknown as TRecordCartProduct
}

function mergeCartProducts(targetCartProducts: TRecordCartProduct, sourceCartProducts: TRecordCartProduct): TRecordCartProduct {
  const mergedCartProducts = { ...targetCartProducts }

  for (const [productKey, sourceProduct] of Object.entries(sourceCartProducts)) {
    const targetProduct = mergedCartProducts[productKey]

    if (!targetProduct) {
      mergedCartProducts[productKey] = sourceProduct
      continue
    }

    mergedCartProducts[productKey] = {
      ...targetProduct,
      ...sourceProduct,
      quantity: (targetProduct.quantity || 0) + (sourceProduct.quantity || 0),
      variantId: targetProduct.variantId ?? sourceProduct.variantId ?? null,
    }
  }

  return mergedCartProducts
}

async function getCartProducts(userId: string): Promise<TRecordCartProduct> {
  const { data: cartResponse, error: selectCartError } = await supabaseAdmin
    .from("23_users_cart")
    .select("cart_products")
    .eq("id", userId)
    .maybeSingle()

  if (selectCartError) throw selectCartError

  return toCartRecord(cartResponse?.cart_products)
}

async function upsertUserCart(userId: string, cartProducts: TRecordCartProduct) {
  const { error: upsertCartError } = await supabaseAdmin.from("23_users_cart").upsert({
    id: userId,
    cart_products: cartProducts as unknown as Json,
  })

  if (upsertCartError) throw upsertCartError
}

async function ensureUserCart(userId: string) {
  await upsertUserCart(userId, await getCartProducts(userId))
}

async function mergeCartIntoTarget(sourceUserId: string, targetUserId: string) {
  if (sourceUserId === targetUserId) return

  const [sourceCartProducts, targetCartProducts] = await Promise.all([getCartProducts(sourceUserId), getCartProducts(targetUserId)])
  const mergedCartProducts = mergeCartProducts(targetCartProducts, sourceCartProducts)

  if (Object.keys(mergedCartProducts).length > 0) {
    await upsertUserCart(targetUserId, mergedCartProducts)
  }

  const { error: deleteCartError } = await supabaseAdmin.from("23_users_cart").delete().eq("id", sourceUserId)
  if (deleteCartError) throw deleteCartError
}

async function reassignAuthScopedRows(sourceUserId: string, targetUserId: string) {
  if (sourceUserId === targetUserId) return

  const [{ error: updateProductsError }, { error: updateTicketsError }] = await Promise.all([
    supabaseAdmin.from("23_products").update({ owner_id: targetUserId }).eq("owner_id", sourceUserId),
    supabaseAdmin.from("23_tickets").update({ owner_id: targetUserId }).eq("owner_id", sourceUserId),
  ])

  if (updateProductsError) throw updateProductsError
  if (updateTicketsError) throw updateTicketsError

  await mergeCartIntoTarget(sourceUserId, targetUserId)
}

async function reassignPublicScopedRows(sourceUserId: string, targetUserId: string) {
  if (sourceUserId === targetUserId) return

  const { error: updateMessagesError } = await supabaseAdmin
    .from("23_messages")
    .update({ sender_id: targetUserId })
    .eq("sender_id", sourceUserId)

  if (updateMessagesError) throw updateMessagesError
}

export async function syncPublicUserRecord(user: User, options: SyncPublicUserOptions = {}): Promise<SyncPublicUserResult> {
  const email = normalizeAuthEmail(user.email)
  if (!email) throw new Error("Authenticated user is missing email")

  const authUserId = user.id
  const provider = options.provider?.trim() || null
  const fallbackUsername = getUserName(user).trim() || email.split("@")[0]

  const { data: existingRows, error: selectUsersError } = await supabaseAdmin
    .from("23_users")
    .select("*")
    .eq("email", email)
    .order("created_at", { ascending: true })

  if (selectUsersError) throw selectUsersError

  const rows = existingRows || []
  const currentRow = rows.find(row => row.id === authUserId) || null
  const survivorRow = currentRow || rows[0] || null

  const mergedProviders = mergeProviders(...rows.map(row => row.providers), provider ? [provider] : null)
  const mergedRoles = mergeRoles(rows.map(row => row.roles))
  const mergedUsername = getFirstNonEmptyString([...rows.map(row => row.username), fallbackUsername]) || fallbackUsername
  const mergedEmailConfirmedAt = getFirstNonEmptyString([user.email_confirmed_at, ...rows.map(row => row.email_confirmed_at)]) || null
  const mergedAvatarUrl =
    getPreferredAvatarUrl(getFirstNonEmptyString(rows.map(row => sanitizeAvatarUrl(row.avatar_url))), user) || null

  if (!survivorRow) {
    const { error: insertUserError } = await supabaseAdmin.from("23_users").insert({
      id: authUserId,
      username: mergedUsername,
      email,
      avatar_url: mergedAvatarUrl,
      email_confirmed_at: mergedEmailConfirmedAt,
      providers: mergedProviders,
      roles: ["USER"],
    })

    if (insertUserError) throw insertUserError

    await ensureUserCart(authUserId)

    return {
      avatarUrl: mergedAvatarUrl,
      publicUserId: authUserId,
      roles: ["USER"],
      username: mergedUsername,
    }
  }

  for (const duplicateRow of rows.filter(row => row.id !== survivorRow.id && row.id !== authUserId)) {
    await reassignAuthScopedRows(duplicateRow.id, survivorRow.id)
    await reassignPublicScopedRows(duplicateRow.id, survivorRow.id)

    const { error: deleteDuplicateError } = await supabaseAdmin.from("23_users").delete().eq("id", duplicateRow.id)
    if (deleteDuplicateError) throw deleteDuplicateError
  }

  if (survivorRow.id !== authUserId) {
    await reassignAuthScopedRows(survivorRow.id, authUserId)

    const { error: updateUserIdError } = await supabaseAdmin
      .from("23_users")
      .update({
        id: authUserId,
        username: mergedUsername,
        email,
        avatar_url: mergedAvatarUrl,
        email_confirmed_at: mergedEmailConfirmedAt,
        providers: mergedProviders,
        roles: mergedRoles,
      })
      .eq("id", survivorRow.id)

    if (updateUserIdError) throw updateUserIdError

    await reassignPublicScopedRows(survivorRow.id, authUserId)
  } else {
    const { error: updateCurrentUserError } = await supabaseAdmin
      .from("23_users")
      .update({
        username: mergedUsername,
        email,
        avatar_url: mergedAvatarUrl,
        email_confirmed_at: mergedEmailConfirmedAt,
        providers: mergedProviders,
        roles: mergedRoles,
      })
      .eq("id", authUserId)

    if (updateCurrentUserError) throw updateCurrentUserError
  }

  await ensureUserCart(authUserId)

  const { error: updateTicketMetadataError } = await supabaseAdmin
    .from("23_tickets")
    .update({
      owner_username: mergedUsername,
      owner_avatar_url: mergedAvatarUrl,
    })
    .eq("owner_id", authUserId)

  if (updateTicketMetadataError) throw updateTicketMetadataError

  return {
    avatarUrl: mergedAvatarUrl,
    publicUserId: authUserId,
    roles: mergedRoles,
    username: mergedUsername,
  }
}
