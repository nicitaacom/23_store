import { randomBytes } from "node:crypto"
import { mkdir, writeFile } from "node:fs/promises"
import path from "node:path"
import { fileURLToPath, pathToFileURL } from "node:url"

import { createClient } from "@supabase/supabase-js"
import Stripe from "stripe"

import { deriveRunTestPassword } from "./run-password.mjs"
import { verifyStorageObjectAbsent } from "./verify-storage-object.mjs"


const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..")
const artifactDirectory = path.resolve(repositoryRoot, process.env.E2E_ARTIFACT_DIR ?? "artifacts/e2e")

function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceRoleKey) throw new Error("Supabase cleanup settings are missing")
  return createClient(supabaseUrl, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } })
}

function getStripeClient() {
  const stripeKey = process.env.NEXT_STRIPE_SECRET_KEY
  if (!stripeKey?.startsWith("sk_test_")) throw new Error("Stripe cleanup requires a verified TEST key")
  return new Stripe(stripeKey)
}

async function assertRunOwnedAccount(supabase, userId, runId) {
  if (!userId) throw new Error("Resource cleanup requires a recorded run-owned account")
  const { data, error } = await supabase.auth.admin.getUserById(userId)
  const metadata = data?.user?.app_metadata ?? {}
  if (error || !data?.user || metadata.e2e_suite !== "23-store" || metadata.e2e_run_id !== runId) {
    throw new Error("Resource owner does not have the matching 23-store run marker")
  }
}

async function getRunAccountSession(supabase, ownerId, runId, environment) {
  const supabaseUrl = environment.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = environment.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!supabaseUrl || !anonKey) throw new Error("Run-owned app cleanup requires Supabase sign-in settings")
  const { data: userData, error: userError } = await supabase.auth.admin.getUserById(ownerId)
  const user = userData?.user
  if (userError || !user?.email || user.app_metadata?.e2e_suite !== "23-store" || user.app_metadata?.e2e_run_id !== runId) {
    throw new Error("Run-owned app cleanup could not verify its account marker")
  }
  const authClient = createClient(supabaseUrl, anonKey, { auth: { autoRefreshToken: false, persistSession: false } })
  const password = runId === environment.E2E_RUN_ID && environment.E2E_TEST_PASSWORD
    ? environment.E2E_TEST_PASSWORD
    : deriveRunTestPassword(environment.SUPABASE_SERVICE_ROLE_KEY, runId)
  let signInResult = await authClient.auth.signInWithPassword({ email: user.email, password })
  if (signInResult.error || !signInResult.data.session?.access_token) {
    // Recover accounts from older runs whose in-memory password was lost when a runner was stopped.
    const recoveryPassword = randomBytes(32).toString("base64url")
    const { error: passwordUpdateError } = await supabase.auth.admin.updateUserById(ownerId, { password: recoveryPassword })
    if (passwordUpdateError) throw new Error("Run-owned account password recovery failed")
    signInResult = await authClient.auth.signInWithPassword({ email: user.email, password: recoveryPassword })
  }
  if (signInResult.error || !signInResult.data.session?.access_token) throw new Error("Run-owned account could not sign in for app cleanup")
  return { accessToken: signInResult.data.session.access_token, email: user.email }
}

async function callRunOwnedApp(supabase, resource, runId, environment, pathname, body) {
  const baseUrl = environment.E2E_BASE_URL ?? environment.NEXT_PUBLIC_PRODUCTION_URL
  if (!baseUrl) throw new Error("Production URL is required for app-side provider cleanup")
  const session = await getRunAccountSession(supabase, resource.owner_id, runId, environment)
  const appUrl = new URL(baseUrl)
  const response = await fetch(new URL(pathname, appUrl), {
    method: "POST",
    headers: {
      authorization: `Bearer ${session.accessToken}`,
      origin: appUrl.origin,
      "content-type": "application/json",
    },
    body: JSON.stringify({ ...body, runId }),
    signal: AbortSignal.timeout(90000),
  })
  const result = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(`Production ${pathname} returned HTTP ${response.status}`)
  return result
}

async function removeProductRow(supabase, resource) {
  if (!resource.owner_id) throw new Error("Product registry record has no owner id")
  const { data: existingProduct, error: readError } = await supabase.from("23_products")
    .select("id, owner_id").eq("id", resource.resource_id).maybeSingle()
  if (readError) throw new Error("Product ownership read failed")
  if (!existingProduct) return "already_absent"
  if (existingProduct.owner_id !== resource.owner_id) throw new Error("Product owner differs from the run journal")
  const { error: deleteError } = await supabase.from("23_products").delete()
    .eq("id", resource.resource_id).eq("owner_id", resource.owner_id)
  if (deleteError) throw new Error("Exact owned product deletion failed")
  const { data: remainingProduct, error: verifyError } = await supabase.from("23_products")
    .select("id").eq("id", resource.resource_id).maybeSingle()
  if (verifyError || remainingProduct) throw new Error("Product absence could not be verified")
  return "deleted_by_exact_owner_recovery"
}

async function removeSupportTicket(supabase, resource) {
  const ticketId = resource.resource_id
  const { data: ticket, error: ticketReadError } = await supabase.from("23_tickets")
    .select("id, owner_id").eq("id", ticketId).maybeSingle()
  if (ticketReadError) throw new Error("Ticket ownership read failed")
  if (!ticket) return "already_absent"
  if (ticket.owner_id !== resource.owner_id) throw new Error("Ticket owner differs from the run journal")
  const { error: messageError } = await supabase.from("23_messages").delete().eq("ticket_id", ticketId)
  if (messageError) throw new Error("Ticket messages could not be removed")
  const { error: ticketError } = await supabase.from("23_tickets").delete().eq("id", ticketId)
  if (ticketError) throw new Error("Ticket could not be removed")
  const [{ data: remainingMessages, error: verifyMessagesError }, { data: remainingTicket, error: verifyTicketError }] = await Promise.all([
    supabase.from("23_messages").select("id").eq("ticket_id", ticketId).limit(1),
    supabase.from("23_tickets").select("id").eq("id", ticketId).maybeSingle(),
  ])
  if (verifyMessagesError || verifyTicketError || remainingMessages?.length || remainingTicket) {
    throw new Error("Ticket deletion could not be verified")
  }
  return "deleted_by_exact_ticket_id"
}

async function removePersonalizedDesign(supabase, resource) {
  const productId = resource.details?.productId
  const userId = resource.details?.userId
  if (!productId || !userId || userId !== resource.owner_id) {
    throw new Error("Personalized-design journal must use the run-owned user and exact product id")
  }
  const { data: design, error: readError } = await supabase.from("23_personalized_designs")
    .select("id, user_id, owner_id, product_id").eq("id", resource.resource_id).maybeSingle()
  if (readError) throw new Error("Personalized-design ownership read failed")
  if (!design) return "already_absent"
  if (design.user_id !== userId || design.owner_id !== resource.owner_id || design.product_id !== productId) {
    throw new Error("Personalized-design ownership differs from its run journal; cleanup refused")
  }
  const { error: deleteError } = await supabase.from("23_personalized_designs").delete()
    .eq("id", resource.resource_id).eq("user_id", userId).eq("owner_id", resource.owner_id).eq("product_id", productId)
  if (deleteError) throw new Error("Run-owned personalized design could not be removed")
  const { data: remaining, error: verifyError } = await supabase.from("23_personalized_designs")
    .select("id").eq("id", resource.resource_id).maybeSingle()
  if (verifyError || remaining) throw new Error("Personalized-design absence could not be verified")
  return "deleted_by_exact_design_user_owner_and_product_ids"
}

async function removeStorageObject(supabase, resource, runId, environment) {
  const bucketName = resource.details?.bucket
  const objectPath = resource.details?.path ?? resource.resource_id
  if (!bucketName || !objectPath) throw new Error("Storage registry record is missing its bucket or path")
  const reference = {
    provider: resource.details?.provider,
    bucket: bucketName,
    path: objectPath,
    publicUrl: resource.details?.publicUrl,
  }
  if (!reference.provider || !reference.publicUrl) throw new Error("Storage cleanup record is missing the production public URL")
  await callRunOwnedApp(supabase, resource, runId, environment, "/api/storage/delete", { reference })
  return verifyStorageObjectAbsent(environment, reference)
}

const clearedAiMemoryOwners = new Set()

async function clearRunOwnedAiMemory(supabase, resource, runId, environment) {
  if (clearedAiMemoryOwners.has(resource.owner_id)) return "same run-owned Redis key and Pinecone namespace cleared and verified"
  const result = await callRunOwnedApp(supabase, resource, runId, environment, "/api/e2e/ai-memory", { action: "clear" })
  if (result.success !== true || result.historyCount !== 0 || result.vectorCount !== 0) {
    throw new Error("Production AI memory cleanup did not confirm empty Redis and Pinecone readback")
  }
  clearedAiMemoryOwners.add(resource.owner_id)
  return `production-app-ai-memory:${resource.owner_id}:redis-and-pinecone-empty`
}

async function archiveStripeResource(resource) {
  const stripeClient = getStripeClient()
  if (resource.resource_type === "stripe_product") {
    const stripeProduct = await stripeClient.products.retrieve(resource.resource_id)
    if (stripeProduct.livemode) throw new Error("Stripe product is in live mode; cleanup refused")
    if (!stripeProduct.active) return "already_inactive"
    await stripeClient.products.update(resource.resource_id, { active: false })
    return "deactivated_test_product"
  }
  if (resource.resource_type === "stripe_price") {
    const stripePrice = await stripeClient.prices.retrieve(resource.resource_id)
    if (stripePrice.livemode) throw new Error("Stripe price is in live mode; cleanup refused")
    if (!stripePrice.active) return "already_inactive"
    await stripeClient.prices.update(resource.resource_id, { active: false })
    return "deactivated_test_price"
  }
  if (resource.resource_type === "stripe_checkout_session") {
    const session = await stripeClient.checkout.sessions.retrieve(resource.resource_id)
    if (session.livemode) throw new Error("Stripe session is in live mode; cleanup refused")
    let cleanupMessage = "archived_test_session"
    if (session.status === "open") {
      await stripeClient.checkout.sessions.expire(resource.resource_id)
      cleanupMessage = "expired_test_session"
    }
    if (session.payment_status === "unpaid" && resource.details?.customerEmail && session.customer) {
      const customerId = typeof session.customer === "string" ? session.customer : session.customer.id
      const customer = await stripeClient.customers.retrieve(customerId)
      if ("deleted" in customer && customer.deleted) return `${cleanupMessage};customer-already-absent:${customerId}`
      if (customer.livemode || customer.email !== resource.details.customerEmail) {
        throw new Error("Stripe Checkout customer differs from the unpaid run-owned test customer; cleanup refused")
      }
      await stripeClient.customers.del(customerId)
      const deletedCustomer = await stripeClient.customers.retrieve(customerId)
      if (!("deleted" in deletedCustomer) || !deletedCustomer.deleted) {
        throw new Error("Stripe Checkout test customer is still present after cleanup")
      }
      cleanupMessage += `;deleted_test_customer:${customerId}`
    }
    return cleanupMessage
  }
  throw new Error(`Unsupported Stripe resource type: ${resource.resource_type}`)
}

async function removeAuthUser(supabase, resource) {
  const { data: userData, error: getUserError } = await supabase.auth.admin.getUserById(resource.resource_id)
  if (getUserError) {
    if (getUserError.status === 404 || /not found|does not exist|user_not_found/i.test(getUserError.message)) {
      return "already_absent"
    }
    throw new Error("Run-owned Auth account state could not be verified")
  }
  if (!userData?.user) return "already_absent"
  const userMetadata = userData.user.app_metadata ?? {}
  if (userMetadata.e2e_suite !== "23-store" || userMetadata.e2e_run_id !== resource.run_id) {
    throw new Error("Auth user ownership marker differs from the run journal")
  }
  const quotaCleanup = await callRunOwnedApp(
    supabase,
    { ...resource, owner_id: resource.resource_id },
    resource.run_id,
    process.env,
    "/api/e2e/ai-memory",
    { action: "clear-image-quota" },
  )
  if (quotaCleanup.success !== true || quotaCleanup.count !== 0 || quotaCleanup.keyAbsent !== true || quotaCleanup.dailyKeysAbsent !== true) {
    throw new Error("Run-owned AI image quota cleanup did not verify the Redis key removal")
  }
  const { error: cartError } = await supabase.from("23_users_cart").delete().eq("id", resource.resource_id)
  if (cartError) throw new Error("Run-owned user cart cleanup failed")
  const { error: profileError } = await supabase.from("23_users").delete().eq("id", resource.resource_id)
  if (profileError) throw new Error("Run-owned public user cleanup failed")
  const { error } = await supabase.auth.admin.deleteUser(resource.resource_id)
  if (error) throw new Error("Run-owned Auth user deletion failed")
  const { data: remainingUser, error: verifyError } = await supabase.auth.admin.getUserById(resource.resource_id)
  if (remainingUser?.user) throw new Error("Auth user still exists after deletion")
  if (verifyError && verifyError.status !== 404 && !/not found|does not exist/i.test(verifyError.message)) {
    throw new Error("Auth user deletion could not be verified")
  }
  return "deleted_by_run_marker_and_absence_verified"
}

async function cleanupResource(supabase, resource, environment) {
  if (resource.resource_type !== "auth_user") {
    await assertRunOwnedAccount(supabase, resource.owner_id, resource.run_id)
  }
  if (resource.resource_type === "worker" && resource.details?.terminal !== true) {
    throw new Error("Background worker is not confirmed terminal; its cleanup obligation remains open")
  }
  if (resource.resource_type === "worker") return "terminal_worker_recorded"
  if (resource.resource_type === "product_row") return removeProductRow(supabase, resource)
  if (resource.resource_type === "personalized_design") return removePersonalizedDesign(supabase, resource)
  if (resource.resource_type === "support_ticket") return removeSupportTicket(supabase, resource)
  if (resource.resource_type === "storage_object") return removeStorageObject(supabase, resource, resource.run_id, environment)
  if (resource.resource_type === "redis_key" || resource.resource_type === "pinecone_vector") {
    return clearRunOwnedAiMemory(supabase, resource, resource.run_id, environment)
  }
  if (resource.resource_type.startsWith("stripe_")) return archiveStripeResource(resource)
  if (resource.resource_type === "auth_user") return removeAuthUser(supabase, resource)
  if (["resend_message", "telegram_message", "pusher_event"].includes(resource.resource_type)) return "provider_record_retained_for_audit"
  throw new Error(`Unsupported resource type: ${resource.resource_type}`)
}

async function markResource(supabase, resource, cleanupStatus, cleanupMessage) {
  const nextStatus = cleanupStatus === "complete" ? "cleaned" : "cleanup_required"
  const { error } = await supabase.from("23_e2e_resource_registry").update({
    status: nextStatus,
    updated_at: new Date().toISOString(),
    details: { ...(resource.details ?? {}), cleanup_status: cleanupStatus, cleanup_message: cleanupMessage },
  }).eq("id", resource.id).eq("run_id", resource.run_id)
  if (error) throw new Error("Resource cleanup status could not be written")
}

export async function reconcileResources(environment = process.env) {
  const runId = environment.E2E_RUN_ID
  if (!runId) return { status: "blocked_by_configuration", runId: null, completed: [], pending: [], errors: [], detail: "E2E_RUN_ID is required" }

  const supabase = getSupabaseClient()
  const { data: resources, error } = await supabase.from("23_e2e_resource_registry")
    .select("*").eq("suite_name", "23-store")
    .in("status", ["active", "cleanup_required"]).order("resource_type", { ascending: true })
  if (error) {
    return { status: "blocked_by_configuration", runId, completed: [], pending: [], errors: [], detail: "Resource registry read failed" }
  }

  const now = Date.now()
  const openResources = resources ?? []
  const eligibleResources = openResources.filter(resource => resource.run_id === runId
    || Date.parse(resource.lease_expires_at) <= now)
  const cleanupOrder = new Map([["storage_object", 0], ["redis_key", 1], ["pinecone_vector", 1], ["personalized_design", 2], ["support_ticket", 2], ["product_row", 3], ["auth_user", 9]])
  const orderedEligibleResources = [...eligibleResources].sort((firstResource, secondResource) =>
    (cleanupOrder.get(firstResource.resource_type) ?? 5) - (cleanupOrder.get(secondResource.resource_type) ?? 5))
  const allOpenResources = new Set(openResources.map(resource => resource.id))
  const resourcesById = new Map(openResources.map(resource => [resource.id, resource]))
  const completed = []
  const pending = []
  const errors = []
  for (const resource of orderedEligibleResources) {
    if (resource.resource_type === "auth_user") {
      const dependentResourcesRemain = [...allOpenResources].some(resourceId => {
        if (resourceId === resource.id) return false
        const dependent = resourcesById.get(resourceId)
        return dependent?.owner_id === resource.resource_id
      })
      if (dependentResourcesRemain) {
        const cleanupMessage = "Run-owned account retained because one or more registered resources still need cleanup"
        pending.push({ resourceType: resource.resource_type, resourceId: resource.resource_id, cleanupMessage })
        errors.push({ resourceType: resource.resource_type, resourceId: resource.resource_id, message: cleanupMessage })
        continue
      }
    }
    try {
      const cleanupMessage = await cleanupResource(supabase, resource, environment)
      await markResource(supabase, resource, "complete", cleanupMessage)
      completed.push({ resourceType: resource.resource_type, resourceId: resource.resource_id, cleanupMessage })
      allOpenResources.delete(resource.id)
    } catch (error) {
      const cleanupMessage = error.message
      await markResource(supabase, resource, "cleanup_required", cleanupMessage).catch(() => undefined)
      pending.push({ resourceType: resource.resource_type, resourceId: resource.resource_id, cleanupMessage })
      errors.push({ resourceType: resource.resource_type, resourceId: resource.resource_id, message: cleanupMessage })
    }
  }
  return { status: errors.length ? "failed" : "complete", runId, completed, pending, errors }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await mkdir(artifactDirectory, { recursive: true })
  let cleanupSummary
  try {
    cleanupSummary = await reconcileResources()
  } catch (error) {
    cleanupSummary = { status: "blocked_by_configuration", runId: process.env.E2E_RUN_ID ?? null, completed: [], pending: [], errors: [], detail: error.message }
  }
  await writeFile(path.join(artifactDirectory, "cleanup.json"), `${JSON.stringify(cleanupSummary, null, 2)}\n`)
  console.log(JSON.stringify(cleanupSummary, null, 2))
  if (cleanupSummary.status === "failed") process.exitCode = 1
}
