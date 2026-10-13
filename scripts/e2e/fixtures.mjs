import { createClient } from "@supabase/supabase-js"
import { Pinecone } from "@pinecone-database/pinecone"
import Stripe from "stripe"

const fixtureRoles = [
  { name: "owner", username: "e2e_owner", roles: ["USER"] },
  { name: "other", username: "e2e_other", roles: ["USER"] },
  { name: "support", username: "e2e_support", roles: ["SUPPORT"] },
  { name: "admin", username: "e2e_admin", roles: ["ADMIN"] },
]
const registeredResourceTypes = new Set([
  "auth_user", "product_row", "personalized_design", "support_ticket", "storage_object", "redis_key", "pinecone_vector",
  "stripe_product", "stripe_price", "stripe_checkout_session", "category_row", "category_view", "worker", "resend_message",
  "telegram_message", "pusher_event",
])

function getSupabaseAdmin(environment) {
  if (!environment.NEXT_PUBLIC_SUPABASE_URL || !environment.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("Run-owned account setup requires Supabase URL and service-role access")
  }
  return createClient(environment.NEXT_PUBLIC_SUPABASE_URL, environment.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

function getStripeTestClient(environment) {
  const secretKey = environment.NEXT_STRIPE_SECRET_KEY
  if (!secretKey?.startsWith("sk_test_")) throw new Error("Disposable product setup requires a verified Stripe TEST key")
  return new Stripe(secretKey, { maxNetworkRetries: 0, timeout: 15000 })
}

function normalizeRunId(runId) {
  const normalizedId = runId.toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "")
  if (!normalizedId) throw new Error("E2E_RUN_ID must contain letters or numbers")
  return normalizedId.slice(0, 48)
}

export function createMonthlyFixtureManager(environment = process.env, { accountNamespace } = {}) {
  const supabase = getSupabaseAdmin(environment)
  const runId = environment.E2E_RUN_ID
  const emailDomain = environment.E2E_TEST_EMAIL_DOMAIN?.toLowerCase()
  const testPassword = environment.E2E_TEST_PASSWORD
  if (!runId || !emailDomain || !testPassword) {
    throw new Error("Run id, a routable test email domain, and E2E_TEST_PASSWORD are required")
  }
  if (testPassword.length < 16) throw new Error("E2E_TEST_PASSWORD must contain at least 16 characters")
  const safeRunId = normalizeRunId(runId)
  const accountRunSuffix = accountNamespace ? normalizeRunId(`${safeRunId}-${accountNamespace}`) : safeRunId
  const runAccountIds = new Set()
  let runAccountsPromise

  async function recordResource(resourceType, resourceId, ownerId, details = {}) {
    if (!resourceId || resourceId.includes("*") || resourceId.includes("%")) {
      throw new Error("Resource journal entries require one exact resource id")
    }
    const leaseExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
    const { error } = await supabase.from("23_e2e_resource_registry").upsert({
      suite_name: "23-store",
      run_id: runId,
      resource_type: resourceType,
      resource_id: resourceId,
      owner_id: ownerId,
      status: "active",
      lease_expires_at: leaseExpiresAt,
      details,
      updated_at: new Date().toISOString(),
    }, { onConflict: "suite_name,run_id,resource_type,resource_id" })
    if (error) throw new Error(`Resource registry write failed for ${resourceType}`)
  }

  async function createRunAccountsOnce() {
    const accounts = {}
    for (const accountDefinition of fixtureRoles) {
      const email = `e2e-${accountDefinition.name}+${accountRunSuffix}@${emailDomain}`
      const { data, error } = await supabase.auth.admin.createUser({
        email,
        password: testPassword,
        email_confirm: true,
        user_metadata: {
          username: `${accountDefinition.username}_${safeRunId.slice(-12)}`,
          e2e_suite: "23-store",
          e2e_run_id: runId,
        },
      })
      if (error || !data.user) throw new Error(`Run-owned ${accountDefinition.name} account creation failed`)

      try {
        runAccountIds.add(data.user.id)
        await recordResource("auth_user", data.user.id, data.user.id, { email, role: accountDefinition.name })
      } catch (error) {
        runAccountIds.delete(data.user.id)
        await supabase.auth.admin.deleteUser(data.user.id)
        throw error
      }

      const { error: publicUserError } = await supabase.from("23_users").upsert({
        id: data.user.id,
        email,
        username: data.user.user_metadata.username,
        email_confirmed_at: new Date().toISOString(),
        providers: ["credentials"],
        roles: accountDefinition.roles,
        password_reset_required: false,
      })
      if (publicUserError) throw new Error(`Run-owned ${accountDefinition.name} public profile creation failed`)

      const { error: cartError } = await supabase.from("23_users_cart").insert({ id: data.user.id, cart_products: {} })
      if (cartError) throw new Error(`Run-owned ${accountDefinition.name} cart creation failed`)

      accounts[accountDefinition.name] = { id: data.user.id, email, role: accountDefinition.name }
    }
    return accounts
  }

  async function createRunAccounts() {
    runAccountsPromise ??= createRunAccountsOnce()
    return runAccountsPromise
  }

  async function recordCreatedResource(resource) {
    if (resource.runId !== runId) throw new Error("Resource journal run id differs from the active run")
    if (!registeredResourceTypes.has(resource.resourceType)) throw new Error("Resource journal type is not supported")
    if (!resource.ownerId || !runAccountIds.has(resource.ownerId)) {
      throw new Error("Resource owner must be one of this run's registered test accounts")
    }
    await recordResource(resource.resourceType, resource.resourceId, resource.ownerId ?? null, resource.details ?? {})
    return { recorded: true, resourceType: resource.resourceType, resourceId: resource.resourceId }
  }

  async function createProductFixture(input) {
    if (!runAccountIds.has(input.ownerId)) throw new Error("Fixture product owner must be one of this run's registered accounts")
    if (!/^[a-z0-9][a-z0-9-]{1,39}$/.test(input.key ?? "")) throw new Error("Product fixture key must be a short lowercase slug")
    if (!Number.isFinite(input.price) || input.price <= 0 || !Number.isSafeInteger(input.onStock) || input.onStock < 0) {
      throw new Error("Product fixture requires a positive price and non-negative whole-number stock")
    }
    const variants = input.variants ?? null
    if (variants !== null && (!Array.isArray(variants) || variants.some(variant =>
      !variant || typeof variant.id !== "string" || !variant.id || typeof variant.label !== "string" || !variant.label
      || !Number.isFinite(variant.price) || variant.price <= 0 || !Number.isSafeInteger(variant.quantity) || variant.quantity < 0))) {
      throw new Error("Product fixture variants require exact ids, labels, positive prices, and non-negative whole-number stock")
    }

    const stripe = getStripeTestClient(environment)
    const fixtureSuffix = `${safeRunId}-${input.key}`
    const idempotencyKey = `23-store-e2e-${fixtureSuffix}`
    const translations = input.translations ?? Object.fromEntries(["en", "fi", "ru", "se"].map(locale => [locale, {
      title: `${input.title} ${locale.toUpperCase()}`,
      description: input.description,
    }]))
    const stripeProduct = await stripe.products.create({
      name: translations.fi.title,
      description: translations.fi.description,
      active: true,
      metadata: { storage_owner_id: input.ownerId, e2e_suite: "23-store", e2e_run_id: runId },
    }, { idempotencyKey: `${idempotencyKey}-product` })
    await recordResource("stripe_product", stripeProduct.id, input.ownerId, {
      provider: "stripe", mode: "test", fixtureKey: input.key,
    })

    const stripePrice = await stripe.prices.create({
      product: stripeProduct.id,
      unit_amount: Math.round(input.price * 100),
      currency: "usd",
    }, { idempotencyKey: `${idempotencyKey}-price` })
    await recordResource("stripe_price", stripePrice.id, input.ownerId, {
      provider: "stripe", mode: "test", productId: stripeProduct.id, fixtureKey: input.key,
    })
    await stripe.products.update(stripeProduct.id, { default_price: stripePrice.id })

    const { error } = await supabase.from("23_products").upsert({
      id: stripeProduct.id,
      owner_id: input.ownerId,
      price_id: stripePrice.id,
      price: input.price,
      ai_price_baseline: input.price,
      ai_pricing_enabled: false,
      on_stock: input.onStock,
      img_url: [],
      variants,
      category_id: null,
      translations,
      personalization: null,
      replanishment_requests_count: 0,
    }, { onConflict: "id" })
    if (error) throw new Error("Run-owned product fixture could not be inserted into Supabase")
    await recordResource("product_row", stripeProduct.id, input.ownerId, {
      fixtureKey: input.key, priceId: stripePrice.id,
    })

    return {
      id: stripeProduct.id,
      priceId: stripePrice.id,
      ownerId: input.ownerId,
      price: input.price,
      onStock: input.onStock,
      translations,
      variants,
    }
  }

  async function recordWorkerCompletion(input) {
    if (input.runId !== runId || !runAccountIds.has(input.ownerId) || !input.resourceId || !input.verificationReference) {
      throw new Error("Worker completion needs this run's account, exact resource id, and independent readback")
    }
    const { data, error } = await supabase.from("23_e2e_resource_registry").update({
      details: {
        ...(input.details ?? {}),
        terminal: true,
        terminal_verified_at: new Date().toISOString(),
        verification_reference: input.verificationReference,
      },
      updated_at: new Date().toISOString(),
    }).eq("suite_name", "23-store").eq("run_id", runId).eq("resource_type", "worker")
      .eq("resource_id", input.resourceId).eq("owner_id", input.ownerId).eq("status", "active")
      .select("id")
    if (error || !data?.length) throw new Error("Worker cleanup obligation could not be marked terminal")
    return { resourceId: input.resourceId, verificationReference: input.verificationReference }
  }

  async function readProduct(productId) {
    if (!productId || productId.includes("*") || productId.includes("%")) throw new Error("Product read requires an exact id")
    const { data, error } = await supabase.from("23_products").select("*").eq("id", productId).maybeSingle()
    if (error) throw new Error("Product readback failed")
    return data
  }

  async function readRunUserProfile(ownerId) {
    if (!runAccountIds.has(ownerId)) throw new Error("User profile readback requires an account created by this run")
    const { data, error } = await supabase.from("23_users")
      .select("id, preferred_language, avatar_url").eq("id", ownerId).maybeSingle()
    if (error) throw new Error("Run-owned user profile readback failed")
    if (!data) return null
    return {
      profile: data,
      verificationReference: `supabase:23_users:${ownerId}:preferred-language-and-avatar`,
    }
  }

  async function restoreRunUserLanguage(ownerId, language) {
    if (!runAccountIds.has(ownerId) || (language !== null && typeof language !== "string")) {
      throw new Error("Profile restoration requires one run-owned account and its original language value")
    }
    const { data, error } = await supabase.from("23_users").update({ preferred_language: language })
      .eq("id", ownerId).select("id, preferred_language").maybeSingle()
    if (error || !data || data.preferred_language !== language) {
      throw new Error("Run-owned preferred language could not be restored and verified")
    }
    return `supabase:23_users:${ownerId}:preferred-language-restored`
  }

  async function readRunCategory(input) {
    if (!runAccountIds.has(input.ownerId) || !input.categoryId || input.categoryId.includes("*") || input.categoryId.includes("%")) {
      throw new Error("Category readback requires one exact category and this run's account")
    }
    const { data: journalEntry, error: journalError } = await supabase.from("23_e2e_resource_registry")
      .select("id").eq("suite_name", "23-store").eq("run_id", runId)
      .eq("resource_type", "category_row").eq("resource_id", input.categoryId)
      .eq("owner_id", input.ownerId).maybeSingle()
    if (journalError || !journalEntry) throw new Error("Category readback requires its run-owned resource journal")
    const { data, error } = await supabase.from("23_categories").select("id, name, parent_id")
      .eq("id", input.categoryId).maybeSingle()
    if (error) throw new Error("Run-owned category readback failed")
    return data ? {
      category: data,
      verificationReference: `supabase:23_categories:${input.categoryId}:exact-read-back`,
    } : null
  }

  async function readRunCategoryView(input) {
    if (!runAccountIds.has(input.ownerId) || !input.categoryId || input.categoryId.includes("*") || input.categoryId.includes("%")) {
      throw new Error("Category-view readback requires this run's account and one exact category")
    }
    const { data, error } = await supabase.from("23_category_views")
      .select("user_id, category_id, view_count, last_viewed_at")
      .eq("user_id", input.ownerId).eq("category_id", input.categoryId).maybeSingle()
    if (error) throw new Error("Run-owned category-view readback failed")
    return {
      view: data,
      verificationReference: `supabase:23_category_views:${input.ownerId}:${input.categoryId}:exact-read-back`,
    }
  }

  async function cleanupRunCategoryView(input) {
    if (!runAccountIds.has(input.ownerId) || !input.categoryId || input.categoryId.includes("*") || input.categoryId.includes("%")) {
      throw new Error("Category-view cleanup requires this run's account and one exact category")
    }
    const resourceId = `${input.ownerId}:${input.categoryId}`
    const { data: journalEntry, error: journalError } = await supabase.from("23_e2e_resource_registry")
      .select("id, details").eq("suite_name", "23-store").eq("run_id", runId)
      .eq("resource_type", "category_view").eq("resource_id", resourceId)
      .eq("owner_id", input.ownerId).eq("status", "active").maybeSingle()
    if (journalError || !journalEntry) throw new Error("Category-view cleanup requires its exact run-owned journal")
    const { error: deleteError } = await supabase.from("23_category_views").delete()
      .eq("user_id", input.ownerId).eq("category_id", input.categoryId)
    if (deleteError) throw new Error("Run-owned category view could not be cleaned up")
    const { data: remaining, error: readError } = await supabase.from("23_category_views")
      .select("category_id").eq("user_id", input.ownerId).eq("category_id", input.categoryId).maybeSingle()
    if (readError || remaining) throw new Error("Category-view cleanup could not be verified")
    const { error: journalUpdateError } = await supabase.from("23_e2e_resource_registry").update({
      status: "cleaned",
      updated_at: new Date().toISOString(),
      details: { ...(journalEntry.details ?? {}), cleanup_status: "complete", cleanup_message: "deleted_by_exact_user_and_category_ids" },
    }).eq("id", journalEntry.id).eq("run_id", runId).eq("status", "active")
    if (journalUpdateError) throw new Error("Category-view cleanup status could not be recorded")
    return `supabase:23_category_views:${input.ownerId}:${input.categoryId}:absent`
  }

  async function markRunCategoryCleaned(input) {
    if (!runAccountIds.has(input.ownerId) || !input.categoryId || input.categoryId.includes("*") || input.categoryId.includes("%")) {
      throw new Error("Category cleanup requires this run's account and one exact category")
    }
    const { data: category, error: categoryError } = await supabase.from("23_categories")
      .select("id").eq("id", input.categoryId).maybeSingle()
    if (categoryError || category) throw new Error("Category is still present; cleanup cannot be marked complete")
    const { data: journalEntry, error: journalError } = await supabase.from("23_e2e_resource_registry")
      .select("id, details").eq("suite_name", "23-store").eq("run_id", runId)
      .eq("resource_type", "category_row").eq("resource_id", input.categoryId)
      .eq("owner_id", input.ownerId).eq("status", "active").maybeSingle()
    if (journalError || !journalEntry) throw new Error("Category cleanup requires its exact run-owned journal")
    const { error: journalUpdateError } = await supabase.from("23_e2e_resource_registry").update({
      status: "cleaned",
      updated_at: new Date().toISOString(),
      details: { ...(journalEntry.details ?? {}), cleanup_status: "complete", cleanup_message: "deleted_by_exact_category_id_and_absence_verified" },
    }).eq("id", journalEntry.id).eq("run_id", runId).eq("status", "active")
    if (journalUpdateError) throw new Error("Category cleanup status could not be recorded")
    return `supabase:23_categories:${input.categoryId}:absent`
  }

  async function readRunSupportTicket(ticketId, ownerId) {
    if (!runAccountIds.has(ownerId) || !ticketId || ticketId.includes("*") || ticketId.includes("%")) {
      throw new Error("Support ticket readback requires an exact ticket and this run's account")
    }
    const { data: ticket, error: ticketError } = await supabase.from("23_tickets")
      .select("*").eq("id", ticketId).eq("owner_id", ownerId).maybeSingle()
    if (ticketError) throw new Error("Run-owned support ticket readback failed")
    if (!ticket) return null
    const { data: messages, error: messagesError } = await supabase.from("23_messages")
      .select("*").eq("ticket_id", ticketId).order("created_at", { ascending: true })
    if (messagesError) throw new Error("Run-owned support messages readback failed")
    return {
      ticket,
      messages: messages ?? [],
      verificationReference: `supabase:23_tickets:${ticketId}:owner:${ownerId};23_messages:ordered-read-back`,
    }
  }

  async function cleanupRunSupportTicket(input) {
    const { ticketId, ownerId } = input
    if (!runAccountIds.has(ownerId) || !ticketId || ticketId.includes("*") || ticketId.includes("%")) {
      throw new Error("Support cleanup requires one exact ticket owned by this run's account")
    }
    const { data: journalEntry, error: journalError } = await supabase.from("23_e2e_resource_registry")
      .select("id, details").eq("suite_name", "23-store").eq("run_id", runId)
      .eq("resource_type", "support_ticket").eq("resource_id", ticketId).eq("owner_id", ownerId)
      .eq("status", "active").maybeSingle()
    if (journalError || !journalEntry) throw new Error("Support cleanup could not verify the run-owned ticket journal")

    const { data: ticket, error: ticketReadError } = await supabase.from("23_tickets")
      .select("id, owner_id").eq("id", ticketId).maybeSingle()
    if (ticketReadError) throw new Error("Run-owned ticket cleanup read failed")
    if (ticket && ticket.owner_id !== ownerId) throw new Error("Support ticket owner differs from its run journal")
    const { error: messagesError } = await supabase.from("23_messages").delete().eq("ticket_id", ticketId)
    if (messagesError) throw new Error("Run-owned support messages could not be removed")
    const { error: ticketError } = await supabase.from("23_tickets").delete().eq("id", ticketId).eq("owner_id", ownerId)
    if (ticketError) throw new Error("Run-owned support ticket could not be removed")

    const [{ data: remainingTicket, error: remainingTicketError }, { data: remainingMessages, error: remainingMessagesError }] = await Promise.all([
      supabase.from("23_tickets").select("id").eq("id", ticketId).maybeSingle(),
      supabase.from("23_messages").select("id").eq("ticket_id", ticketId).limit(1),
    ])
    if (remainingTicketError || remainingMessagesError || remainingTicket || remainingMessages?.length) {
      throw new Error("Support ticket deletion could not be verified")
    }
    const { error: journalUpdateError } = await supabase.from("23_e2e_resource_registry").update({
      status: "cleaned",
      updated_at: new Date().toISOString(),
      details: { ...(journalEntry.details ?? {}), cleanup_status: "complete", cleanup_message: "deleted_by_exact_ticket_id_and_absence_verified" },
    }).eq("id", journalEntry.id).eq("run_id", runId).eq("status", "active")
    if (journalUpdateError) throw new Error("Support ticket cleanup status could not be recorded")
    return `supabase:23_tickets:${ticketId}:absent;23_messages:ticket:${ticketId}:absent`
  }

  async function markRunStorageObjectCleaned(input) {
    if (!runAccountIds.has(input.ownerId) || !input.reference?.bucket || !input.reference?.path) {
      throw new Error("Storage cleanup record requires this run's owner and one exact object reference")
    }
    const { data: registryEntry, error: readError } = await supabase.from("23_e2e_resource_registry")
      .select("id, details").eq("suite_name", "23-store").eq("run_id", runId)
      .eq("resource_type", "storage_object").eq("resource_id", input.reference.path)
      .eq("owner_id", input.ownerId).eq("status", "active").maybeSingle()
    if (readError || !registryEntry || registryEntry.details?.bucket !== input.reference.bucket
      || registryEntry.details?.provider !== input.reference.provider) {
      throw new Error("Storage cleanup reference differs from the run's exact object journal")
    }
    const { error: updateError } = await supabase.from("23_e2e_resource_registry").update({
      status: "cleaned",
      updated_at: new Date().toISOString(),
      details: { ...(registryEntry.details ?? {}), cleanup_status: "complete", cleanup_message: "deleted_by_owner_storage_route_and_absence_verified" },
    }).eq("id", registryEntry.id).eq("run_id", runId).eq("status", "active")
    if (updateError) throw new Error("Storage cleanup status could not be recorded")
    return { recorded: true, resourceId: input.reference.path }
  }

  async function readRunPersonalizedDesign(input) {
    if (!runAccountIds.has(input.ownerId) || !runAccountIds.has(input.userId) || !input.designId || !input.productId) {
      throw new Error("Personalized-design readback requires this run's owner and exact design and product ids")
    }
    const { data, error } = await supabase.from("23_personalized_designs").select("*")
      .eq("id", input.designId).eq("owner_id", input.ownerId).eq("user_id", input.userId)
      .eq("product_id", input.productId).maybeSingle()
    if (error) throw new Error("Run-owned personalized-design readback failed")
    if (!data) return null
    return {
      design: data,
      verificationReference: `supabase:23_personalized_designs:${input.designId}:owner:${input.ownerId}:user:${input.userId}:product:${input.productId}`,
    }
  }

  async function cleanupRunPersonalizedDesign(input) {
    if (!runAccountIds.has(input.ownerId) || !runAccountIds.has(input.userId) || !input.designId || !input.productId) {
      throw new Error("Personalized-design cleanup requires this run's owner and exact design, user, and product ids")
    }
    const { data: journal, error: journalError } = await supabase.from("23_e2e_resource_registry")
      .select("id, details").eq("suite_name", "23-store").eq("run_id", runId)
      .eq("resource_type", "personalized_design").eq("resource_id", input.designId)
      .eq("owner_id", input.ownerId).eq("status", "active").maybeSingle()
    if (journalError || !journal || journal.details?.productId !== input.productId || journal.details?.userId !== input.userId) {
      throw new Error("Personalized-design cleanup requires its exact run-owned journal")
    }

    const { data: design, error: readError } = await supabase.from("23_personalized_designs").select("id, user_id, owner_id, product_id")
      .eq("id", input.designId).maybeSingle()
    if (readError) throw new Error("Personalized-design cleanup readback failed")
    if (design && (design.user_id !== input.userId || design.owner_id !== input.ownerId || design.product_id !== input.productId)) {
      throw new Error("Personalized-design row does not match the run journal; deletion refused")
    }
    if (design) {
      const { error: deleteError } = await supabase.from("23_personalized_designs").delete()
        .eq("id", input.designId).eq("user_id", input.userId).eq("owner_id", input.ownerId).eq("product_id", input.productId)
      if (deleteError) throw new Error("Run-owned personalized design could not be removed")
    }
    const { data: remaining, error: verifyError } = await supabase.from("23_personalized_designs")
      .select("id").eq("id", input.designId).maybeSingle()
    if (verifyError || remaining) throw new Error("Personalized-design absence could not be verified")
    const { error: journalUpdateError } = await supabase.from("23_e2e_resource_registry").update({
      status: "cleaned",
      updated_at: new Date().toISOString(),
      details: { ...(journal.details ?? {}), cleanup_status: "complete", cleanup_message: "deleted_by_exact_design_user_owner_and_product_ids" },
    }).eq("id", journal.id).eq("run_id", runId).eq("status", "active")
    if (journalUpdateError) throw new Error("Personalized-design cleanup status could not be recorded")
    return `supabase:23_personalized_designs:${input.designId}:absent`
  }

  async function readRunAiMemory(ownerId) {
    if (!runAccountIds.has(ownerId)) throw new Error("AI memory readback requires an account created by this run")

    const redisUrl = environment.UPSTASH_REDIS_REST_URL
    const redisToken = environment.UPSTASH_REDIS_REST_TOKEN
    if (!redisUrl || !redisToken) throw new Error("AI memory readback requires Upstash REST settings")
    const historyKey = `ai:history:${ownerId}`
    const redisResponse = await fetch(redisUrl, {
      method: "POST",
      headers: { authorization: `Bearer ${redisToken}`, "content-type": "application/json" },
      body: JSON.stringify(["LRANGE", historyKey, "0", "-1"]),
      signal: AbortSignal.timeout(12000),
    })
    const redisBody = await redisResponse.json().catch(() => ({}))
    if (!redisResponse.ok || !Array.isArray(redisBody.result)) throw new Error("Run-owned AI history readback failed")
    const history = redisBody.result.map(entry => {
      try {
        const parsed = JSON.parse(entry)
        if (!["user", "assistant"].includes(parsed.role) || typeof parsed.text !== "string") {
          throw new Error("Invalid history entry")
        }
        return { role: parsed.role, text: parsed.text }
      } catch {
        throw new Error("Run-owned AI history contains an invalid record")
      }
    })

    const pineconeApiKey = environment.PINECONE_API_KEY
    const indexName = environment.PINECONE_INDEX
    const indexHost = environment.PINECONE_ENVIRONMENT
    if (!pineconeApiKey || (!indexName && !indexHost)) throw new Error("AI memory readback requires Pinecone settings")
    const indexOptions = {}
    if (indexHost) indexOptions.host = indexHost
    if (indexName) indexOptions.name = indexName
    const index = new Pinecone({ apiKey: pineconeApiKey }).index(indexOptions)
    const namespace = index.namespace(ownerId)
    const vectorIds = []
    let paginationToken
    for (let pageNumber = 0; pageNumber < 20; pageNumber++) {
      const page = await namespace.listPaginated({ limit: 100, ...(paginationToken ? { paginationToken } : {}) })
      vectorIds.push(...(page.vectors ?? []).map(vector => vector.id))
      paginationToken = page.pagination?.next
      if (!paginationToken) break
      if (pageNumber === 19) throw new Error("Run-owned Pinecone namespace is larger than the readback limit")
    }

    const vectorRecords = []
    for (let offset = 0; offset < vectorIds.length; offset += 100) {
      const batchIds = vectorIds.slice(offset, offset + 100)
      const response = await index.fetch({ ids: batchIds, namespace: ownerId })
      for (const [id, record] of Object.entries(response.records ?? {})) {
        const metadata = record.metadata ?? {}
        if (!/^(user|assistant):\d+:[0-9a-f-]+$/i.test(id)
          || !["user", "assistant"].includes(metadata.role) || typeof metadata.text !== "string") {
          throw new Error("Run-owned Pinecone namespace contains an unrecognized AI memory record")
        }
        vectorRecords.push({ id, role: metadata.role, text: metadata.text })
      }
    }

    return {
      historyKey,
      history,
      vectorRecords,
      verificationReference: `upstash:${historyKey}:read-back;pinecone:${ownerId}:${vectorRecords.length}-vectors-read-back`,
    }
  }

  async function captureRunAiMemory(ownerId) {
    const memory = await readRunAiMemory(ownerId)
    await recordResource("redis_key", memory.historyKey, ownerId, { provider: "upstash", purpose: "sales-assistant-history" })
    for (const vector of memory.vectorRecords) {
      await recordResource("pinecone_vector", vector.id, ownerId, {
        provider: "pinecone",
        index: environment.PINECONE_INDEX,
        host: environment.PINECONE_ENVIRONMENT,
        namespace: ownerId,
        role: vector.role,
      })
    }
    return memory
  }

  async function readRunCart(ownerId) {
    if (!runAccountIds.has(ownerId)) throw new Error("Cart readback requires an account created by this run")
    const { data, error } = await supabase.from("23_users_cart").select("cart_products").eq("id", ownerId).maybeSingle()
    if (error) throw new Error("Run-owned cart readback failed")
    return data?.cart_products ?? null
  }

  function sortObjectKeys(value) {
    if (Array.isArray(value)) return value.map(sortObjectKeys)
    if (!value || typeof value !== "object") return value
    return Object.fromEntries(Object.keys(value).sort().map(key => [key, sortObjectKeys(value[key])]))
  }

  async function waitForRunCart(input) {
    const timeoutMs = Math.min(Math.max(Number(input.timeoutMs) || 15000, 1000), 60000)
    const expected = JSON.stringify(sortObjectKeys(input.expected))
    const stopAt = Date.now() + timeoutMs
    let latest = null
    while (Date.now() < stopAt) {
      latest = await readRunCart(input.ownerId)
      if (JSON.stringify(sortObjectKeys(latest ?? {})) === expected) {
        return { cart: latest ?? {}, verificationReference: `supabase:23_users_cart:${input.ownerId}:exact-cart-read-back` }
      }
      await new Promise(resolve => setTimeout(resolve, 250))
    }
    throw new Error(`Run-owned cart did not reach the expected state for account ${input.ownerId}`)
  }

  async function cleanupRunCart(ownerId) {
    if (!runAccountIds.has(ownerId)) throw new Error("Cart cleanup requires an account created by this run")
    const { error } = await supabase.from("23_users_cart").update({ cart_products: {} }).eq("id", ownerId)
    if (error) throw new Error("Run-owned cart cleanup failed")
    return waitForRunCart({ ownerId, expected: {} })
  }

  async function waitForTranslatedProduct(productId, expected = {}) {
    const timeoutMs = Math.min(Math.max(Number(expected.timeoutMs) || 600000, 1000), 600000)
    const stopAt = Date.now() + timeoutMs
    let latestProduct = null

    while (Date.now() < stopAt) {
      latestProduct = await readProduct(productId)
      const translations = latestProduct?.translations
      const locales = ["en", "fi", "ru", "se"]
      const completeTranslations = locales.every(locale =>
        typeof translations?.[locale]?.title === "string" && translations[locale].title.trim()
        && typeof translations?.[locale]?.description === "string" && translations[locale].description.trim())
      const translatedFields = ["fi", "ru", "se"].filter(locale =>
        translations?.[locale]?.title !== expected.title || translations?.[locale]?.description !== expected.description)

      if (latestProduct && completeTranslations && translatedFields.length === 3) {
        return {
          product: latestProduct,
          verificationReference: `supabase:23_products:${productId}:four-locales-translated`,
          translatedLocales: translatedFields,
          observedAt: new Date().toISOString(),
        }
      }

      await new Promise(resolve => setTimeout(resolve, 5000))
    }

    throw new Error(`Product translation worker did not finish for ${productId} within ${timeoutMs} ms`)
  }

  return {
    createRunAccounts,
    recordCreatedResource,
    createProductFixture,
    recordWorkerCompletion,
    readProduct,
    readRunUserProfile,
    restoreRunUserLanguage,
    readRunCategory,
    readRunCategoryView,
    cleanupRunCategoryView,
    markRunCategoryCleaned,
    readRunSupportTicket,
    cleanupRunSupportTicket,
    markRunStorageObjectCleaned,
    readRunPersonalizedDesign,
    cleanupRunPersonalizedDesign,
    readRunAiMemory,
    captureRunAiMemory,
    waitForTranslatedProduct,
    readRunCart,
    waitForRunCart,
    cleanupRunCart,
  }
}
