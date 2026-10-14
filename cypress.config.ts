import { createHash } from "node:crypto"
import { appendFile, mkdir, readFile } from "node:fs/promises"
import path from "node:path"
import { defineConfig } from "cypress"
import { createClient, User } from "@supabase/supabase-js"

import {
  cleanupStripeTestCheckoutSession,
  verifyStripePriceInactive,
  verifyStripeResourcesInactive,
  verifyStripeTestCheckoutSession,
  verifyStripeTestProduct,
} from "./scripts/e2e/verify-stripe-test-resources.mjs"
import { decodeDeviceId, isValidDeviceId } from "./app/utils/deviceId"
import { verifyStorageObjectAbsent, verifyStorageObjectPresent } from "./scripts/e2e/verify-storage-object.mjs"
import type { Database, Json } from "./app/ts/types_db"
import { createMonthlyFixtureManager } from "./scripts/e2e/fixtures.mjs"
import { createPaidBudgetManager } from "./scripts/e2e/paid-budget.mjs"

function redactEvidence(value: unknown, parentKey = ""): unknown {
  if (/authorization|cookie|password|secret|token|wallet|signed.?url|reset.?link/i.test(parentKey)) return "[REDACTED]"
  if (Array.isArray(value)) return value.map(item => redactEvidence(item))
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, child]) => [key, redactEvidence(child, key)]))
  }
  if (typeof value !== "string") return value
  return value
    .replace(/Bearer\s+[^\s,;]+/gi, "Bearer [REDACTED]")
    .replace(/([?&](?:X-Amz-Signature|X-Amz-Credential|signature|token|access_token)=)[^&\s]+/gi, "$1[REDACTED]")
}

function matchesInventoryRoute(routePattern: string, actualPath: string) {
  const segments = routePattern.split("/")
  let optionalCatchAllSuffix = ""
  if (segments.at(-1)?.startsWith(":") && segments.at(-1)?.endsWith("*?")) {
    segments.pop()
    optionalCatchAllSuffix = "(?:/.*)?"
  }
  const pattern = segments.map(segment => {
    if (segment.startsWith(":")) return segment.endsWith("*") ? ".*" : "[^/]+"
    return segment.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
  }).join("/")
  return new RegExp(`^${pattern}${optionalCatchAllSuffix}$`).test(actualPath)
}

let requestInventoryPromise: Promise<{ operations: Array<{ operationId: string; operationKind: string; method?: string; route?: string; scenarioId?: string }> }> | null = null

async function attachRouteOperation(record: Record<string, unknown>) {
  if (record.kind === "scenario-diagnostics" && Array.isArray(record.timeline)) {
    requestInventoryPromise ??= readFile(path.join(E2E_ARTIFACT_DIRECTORY, "request-inventory.json"), "utf8")
      .then(inventoryText => JSON.parse(inventoryText))
      .catch(() => ({ operations: [] }))
    const inventory = await requestInventoryPromise
    const timeline = (record.timeline as Array<Record<string, unknown>>).map(timelineRecord => {
      if (timelineRecord.kind !== "request-finish" || typeof timelineRecord.method !== "string"
        || typeof timelineRecord.pathname !== "string") return timelineRecord
      const routeOperation = inventory.operations.find(operation => operation.operationKind === "http-route"
        && operation.method === timelineRecord.method && operation.route
        && matchesInventoryRoute(operation.route, timelineRecord.pathname as string))
      return routeOperation ? {
        ...timelineRecord,
        operationId: routeOperation.operationId,
        sourceScenarioId: routeOperation.scenarioId ?? null,
      } : timelineRecord
    })
    return { ...record, timeline }
  }
  return record
}

const LOCAL_DEV_URL = "http://localhost:3023"
const E2E_SUITE = process.env.E2E_SUITE ?? "legacy"

function getE2EBaseUrl(): string {
  const productionUrl = process.env.NEXT_PUBLIC_PRODUCTION_URL
  const explicitUrl = process.env.E2E_BASE_URL
  const baseUrl = E2E_SUITE === "weekly"
    ? productionUrl
    : E2E_SUITE === "replay"
      ? explicitUrl ?? productionUrl
      : explicitUrl ?? LOCAL_DEV_URL

  if (!baseUrl) throw new Error(`Cypress suite ${E2E_SUITE} requires NEXT_PUBLIC_PRODUCTION_URL or E2E_BASE_URL`)
  if (E2E_SUITE === "weekly" && explicitUrl && explicitUrl !== productionUrl) {
    throw new Error("The weekly suite always runs against NEXT_PUBLIC_PRODUCTION_URL")
  }
  if (E2E_SUITE === "replay") {
    const replayUrl = new URL(baseUrl)
    const productionOrigin = productionUrl ? new URL(productionUrl).origin : null
    const isLoopback = ["localhost", "127.0.0.1", "::1", "[::1]"].includes(replayUrl.hostname)
    if (replayUrl.origin !== productionOrigin && !isLoopback) {
      throw new Error("Replay must use NEXT_PUBLIC_PRODUCTION_URL or a local production build")
    }
  }

  return baseUrl
}

const E2E_BASE_URL = getE2EBaseUrl()
const E2E_SPEC_PATTERN = E2E_SUITE === "legacy"
  ? "cypress/e2e/**/*.cy.{ts,tsx}"
  : "cypress/monthly/**/*.cy.{ts,tsx}"
const E2E_ARTIFACT_DIRECTORY = path.resolve(process.cwd(), process.env.E2E_ARTIFACT_DIR ?? "artifacts/e2e")
let monthlyFixtureManager: ReturnType<typeof createMonthlyFixtureManager> | null = null
let paidBudgetManager: ReturnType<typeof createPaidBudgetManager> | null = null

function getMonthlyFixtureManager() {
  monthlyFixtureManager ??= createMonthlyFixtureManager(process.env)
  return monthlyFixtureManager
}

function getPaidBudgetManager() {
  paidBudgetManager ??= createPaidBudgetManager(process.env)
  return paidBudgetManager
}

function legacyTask<TArguments extends unknown[], TResult>(
  taskName: string,
  task: (...arguments_: TArguments) => TResult,
) {
  return (...arguments_: TArguments): TResult => {
    if (E2E_SUITE !== "legacy") throw new Error(`Task ${taskName} is only available in the legacy Cypress suite`)
    return task(...arguments_)
  }
}

function realSuiteTask<TArguments extends unknown[], TResult>(
  taskName: string,
  task: (...arguments_: TArguments) => TResult,
) {
  return (...arguments_: TArguments): TResult => {
    if (E2E_SUITE === "legacy") throw new Error(`Task ${taskName} is only available in weekly real-service suites`)
    return task(...arguments_)
  }
}

const PRODUCT_PREFIX = "cypress-e2e-"

const accounts = {
  owner: {
    email: "cypress-owner@joki.example",
    username: "cypress_owner",
    roles: ["USER"],
  },
  other: {
    email: "cypress-other@joki.example",
    username: "cypress_other",
    roles: ["USER"],
  },
  buyingFlowAdmin: {
    email: "cypress-buying-flow-admin@joki.example",
    username: "cypress_buying_flow_admin",
    roles: ["ADMIN"],
  },
  support: {
    email: "cypress-support@joki.example",
    username: "cypress_support",
    roles: ["SUPPORT"],
  },
}

let preparedAccountsPromise: Promise<{
  owner: Awaited<ReturnType<typeof ensureAccount>>
  other: Awaited<ReturnType<typeof ensureAccount>>
}> | null = null
let preparedBuyingFlowFixturesPromise: Promise<Awaited<ReturnType<typeof prepareBuyingFlowFixtures>>> | null = null
let preparedSupportFixturesPromise: Promise<Awaited<ReturnType<typeof prepareSupportFixtures>>> | null = null

function getSupabaseTestClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Cypress requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY")
  }

  return createClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

function getSupabaseRlsClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !anonKey) {
    throw new Error("Cypress requires NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY")
  }

  return createClient<Database>(supabaseUrl, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

async function findUserByEmail(email: string) {
  const supabase = getSupabaseTestClient()

  for (let page = 1; page <= 10; page += 1) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 1000 })
    if (error) throw error

    const matchedUser = data.users.find(user => user.email === email)
    if (matchedUser) return matchedUser
    if (data.users.length < 1000) return null
  }

  return null
}

async function ensureAccount(account: (typeof accounts)[keyof typeof accounts]) {
  const testPassword = process.env.E2E_TEST_PASSWORD
  if (!testPassword) throw new Error("E2E_TEST_PASSWORD is required to prepare Cypress accounts")

  const supabase = getSupabaseTestClient()
  const findUserByEmailResp = await findUserByEmail(account.email)
  let user: User | null = findUserByEmailResp

  if (user) {
    const { data, error } = await supabase.auth.admin.updateUserById(user.id, {
      password: testPassword,
      email_confirm: true,
      user_metadata: { username: account.username },
    })
    if (error) throw error
    user = data.user
  } else {
    const { data, error } = await supabase.auth.admin.createUser({
      email: account.email,
      password: testPassword,
      email_confirm: true,
      user_metadata: { username: account.username },
    })
    if (error) throw error
    user = data.user
  }

  const confirmedAt = new Date().toISOString()
  const { error: publicUserError } = await supabase.from("23_users").upsert({
    id: user.id,
    email: account.email,
    username: account.username,
    email_confirmed_at: confirmedAt,
    providers: ["credentials"],
    roles: account.roles,
    password_reset_required: false,
  })
  if (publicUserError) throw publicUserError

  const { error: cartError } = await supabase.from("23_users_cart").upsert({ id: user.id, cart_products: {} })
  if (cartError) throw cartError

  return { id: user.id, email: account.email, password: testPassword }
}

// The browser only ever holds the transport form of a deviceId, so a spec hands that value over and
// this side decodes it to the signed id that `utm_stats.user_id` actually holds.
async function readUTMVisits(storedDeviceId: string) {
  const deviceId = decodeDeviceId(storedDeviceId)
  if (!deviceId) return { deviceId: null, isValidDeviceId: false, visits: [] }

  const supabase = getSupabaseTestClient()
  const { data, error } = await supabase
    .from("utm_stats")
    .select("*")
    .eq("user_id", deviceId)
    .order("created_at", { ascending: false })
  if (error) throw error

  return { deviceId, isValidDeviceId: isValidDeviceId(deviceId), visits: data ?? [] }
}

async function readUTMVisitsForUserId(userId: string) {
  const supabase = getSupabaseTestClient()
  const { data, error } = await supabase.from("utm_stats").select("*").eq("user_id", userId)
  if (error) throw error

  return data ?? []
}

/**
 * Every test in one run shares a machine, so it shares a fingerprint, so layer 4 hands each test the same
 * deviceId - correct behaviour, but the once-per-day dedup then refuses the row a later test is looking
 * for, and that test reads the previous test's row instead. Emptying the day is what makes each test
 * independent: with no row for today, the device writes a fresh one whatever id it resolves to.
 *
 * The host comes from E2E_BASE_URL, and the guard below keeps this to a loopback host: pointing the
 * suite at a deployed URL would otherwise let a bulk delete reach real visit rows.
 */
async function deleteVisitsFromTodayForTestHost() {
  const { hostname, host } = new URL(E2E_BASE_URL)
  if (hostname !== "localhost" && hostname !== "127.0.0.1")
    throw new Error(`This task deletes rows in bulk, so it only runs against a loopback E2E_BASE_URL - got ${host}`)

  const supabase = getSupabaseTestClient()
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  const { data, error } = await supabase
    .from("utm_stats")
    .delete()
    .ilike("url", `%${host}%`)
    .gte("created_at", oneDayAgo)
    .select("id")
  if (error) throw error

  return data?.length ?? 0
}

// utm_stats is shared with projects 14/28/29, so a spec deletes exactly the ids it created
async function deleteUTMVisitsForUserId(userId: string) {
  const supabase = getSupabaseTestClient()
  const { error } = await supabase.from("utm_stats").delete().eq("user_id", userId)
  if (error) throw error

  return null
}

async function readBuyingFlowEventsForSession(sessionId: string) {
  const supabase = getSupabaseTestClient()
  const { data, error } = await supabase
    .from("23_buying_flow_events")
    .select("id, event, checkout_kind, search_query, results_count, session_id")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: true })
  if (error) throw error

  return data ?? []
}

async function deleteBuyingFlowEventsForSession(sessionId: string) {
  const supabase = getSupabaseTestClient()
  const { error } = await supabase.from("23_buying_flow_events").delete().eq("session_id", sessionId)
  if (error) throw error

  return null
}

function getTranslations(label: string): Json {
  return {
    en: { title: `${label} EN`, description: `${label} description EN` },
    fi: { title: `${label} FI`, description: `${label} description FI` },
    ru: { title: `${label} RU`, description: `${label} description RU` },
    se: { title: `${label} SE`, description: `${label} description SE` },
  }
}

async function prepareFixtures() {
  const supabase = getSupabaseTestClient()
  preparedAccountsPromise ??= Promise.all([ensureAccount(accounts.owner), ensureAccount(accounts.other)]).then(
    ([owner, other]) => ({ owner, other }),
  )
  const { owner, other } = await preparedAccountsPromise

  const { error: cleanupError } = await supabase.from("23_products").delete().like("id", `${PRODUCT_PREFIX}%`)
  if (cleanupError) throw cleanupError

  const ownerProduct = {
    id: `${PRODUCT_PREFIX}owner-product`,
    price_id: `${PRODUCT_PREFIX}owner-price`,
    owner_id: owner.id,
    translations: getTranslations("Cypress owner product"),
    price: 129,
    img_url: ["/placeholder.jpg"],
    on_stock: 8,
    variants: null,
    category_id: null,
  }
  const otherProduct = {
    id: `${PRODUCT_PREFIX}other-product`,
    price_id: `${PRODUCT_PREFIX}other-price`,
    owner_id: other.id,
    translations: getTranslations("Cypress other product"),
    price: 249,
    img_url: ["/placeholder.jpg"],
    on_stock: 4,
    variants: null,
    category_id: null,
  }

  const { error: productError } = await supabase.from("23_products").insert([ownerProduct, otherProduct])
  if (productError) throw productError

  return { owner, other, ownerProduct, otherProduct }
}

async function prepareBuyingFlowFixtures() {
  const supabase = getSupabaseTestClient()
  const admin = await ensureAccount(accounts.buyingFlowAdmin)
  const product = {
    id: `${PRODUCT_PREFIX}buying-flow-product`,
    price_id: `${PRODUCT_PREFIX}buying-flow-price`,
    owner_id: admin.id,
    translations: getTranslations("Cypress buying flow product"),
    price: 137,
    img_url: ["/placeholder.jpg"],
    on_stock: 8,
    variants: null,
    category_id: null,
  }

  const { error: deleteProductError } = await supabase.from("23_products").delete().eq("id", product.id)
  if (deleteProductError) throw deleteProductError
  const { error: insertProductError } = await supabase.from("23_products").insert(product)
  if (insertProductError) throw insertProductError

  return { admin, product }
}

async function prepareSupportFixtures() {
  const supabase = getSupabaseTestClient()
  const [support, owner] = await Promise.all([ensureAccount(accounts.support), ensureAccount(accounts.owner)])
  const ticketId = `${PRODUCT_PREFIX}support-ticket`
  const messageBody = "Cypress mobile support conversation"

  const { error: cleanupMessagesError } = await supabase.from("23_messages").delete().eq("ticket_id", ticketId)
  if (cleanupMessagesError) throw cleanupMessagesError
  const { error: cleanupTicketError } = await supabase.from("23_tickets").delete().eq("id", ticketId)
  if (cleanupTicketError) throw cleanupTicketError

  const { error: ticketError } = await supabase.from("23_tickets").insert({
    id: ticketId,
    is_open: true,
    last_message_body: messageBody,
    owner_id: owner.id,
    owner_avatar_url: null,
    owner_username: accounts.owner.username,
  })
  if (ticketError) throw ticketError

  const { error: messageError } = await supabase.from("23_messages").insert({
    body: messageBody,
    images: null,
    seen: true,
    sender_avatar_url: null,
    sender_id: owner.id,
    sender_username: accounts.owner.username,
    ticket_id: ticketId,
  })
  if (messageError) throw messageError

  return { support, ticketId, messageBody }
}

async function cleanupSupportFixtures(ticketId: string) {
  if (ticketId !== `${PRODUCT_PREFIX}support-ticket`) {
    throw new Error(`Refusing to delete unexpected Cypress support ticket id: ${ticketId}`)
  }

  const supabase = getSupabaseTestClient()
  const { error: messageError } = await supabase.from("23_messages").delete().eq("ticket_id", ticketId)
  if (messageError) throw messageError
  const { error: ticketError } = await supabase.from("23_tickets").delete().eq("id", ticketId)
  if (ticketError) throw ticketError

  return null
}

async function getBuyingFlowFixtures() {
  preparedBuyingFlowFixturesPromise ??= prepareBuyingFlowFixtures()
  return preparedBuyingFlowFixturesPromise
}

export default defineConfig({
  allowCypressEnv: false,
  expose: {
    E2E_SUITE,
    E2E_RUN_ID: process.env.E2E_RUN_ID,
    // eslint-disable-next-line local-rules/no-undefined-used-envs -- set internally by scripts/e2e/run-weekly.mjs
    E2E_RUNNER_SHA: process.env.E2E_RUNNER_SHA,
    E2E_SEED: process.env.E2E_SEED,
  },
  reporter: E2E_SUITE === "legacy" ? "spec" : "mocha-junit-reporter",
  reporterOptions: E2E_SUITE === "legacy" ? undefined : {
    mochaFile: path.join(E2E_ARTIFACT_DIRECTORY, "junit-[hash].xml"),
    toConsole: true,
    outputs: true,
  },
  retries: { openMode: 0, runMode: 0 },
  taskTimeout: E2E_SUITE === "legacy" ? 60000 : 660000,
  e2e: {
    baseUrl: E2E_BASE_URL,
    env: {
      E2E_SUITE,
      E2E_RUN_ID: process.env.E2E_RUN_ID,
      // eslint-disable-next-line local-rules/no-undefined-used-envs -- set internally by scripts/e2e/run-weekly.mjs
      E2E_RUNNER_SHA: process.env.E2E_RUNNER_SHA,
      E2E_TEST_PASSWORD: process.env.E2E_TEST_PASSWORD,
      E2E_SEED: process.env.E2E_SEED,
    },
    experimentalWebKitSupport: true,
    specPattern: E2E_SPEC_PATTERN,
    supportFile: "cypress/support/e2e.ts",
    video: E2E_SUITE !== "legacy",
    screenshotOnRunFailure: true,
    defaultCommandTimeout: 10000,
    requestTimeout: 10000,
    responseTimeout: 20000,
    setupNodeEvents(on, cypressConfig) {
      on("task", {
        async appendE2EEvidence(evidence: Record<string, unknown>) {
          const artifactDirectory = path.resolve(process.cwd(), process.env.E2E_ARTIFACT_DIR ?? "artifacts/e2e")
          await mkdir(artifactDirectory, { recursive: true })
          const runEvidence = {
            ...evidence,
            runId: cypressConfig.env.E2E_RUN_ID,
            testedCommit: cypressConfig.env.E2E_RUNNER_SHA,
            target: cypressConfig.baseUrl,
          }
          const mappedEvidence = await attachRouteOperation(runEvidence)
          await appendFile(path.join(artifactDirectory, "coverage-events.jsonl"), `${JSON.stringify(redactEvidence(mappedEvidence))}\n`)
          return null
        },
        async getProductImageFixtureMetadata() {
          const imageBytes = await readFile(path.join(process.cwd(), "cypress/files/Sour Cream 30% Savya LITOVSKAYA.png"))
          return { size: imageBytes.length, sha256: createHash("sha256").update(imageBytes).digest("hex") }
        },
        async requireVerifiedStripeTestMode() {
          const summaryPath = path.join(E2E_ARTIFACT_DIRECTORY, "summary.json")
          const summary = JSON.parse(await readFile(summaryPath, "utf8")) as {
            providerModes?: { deployedStripe?: string }
            checks?: Array<{ name?: string; status?: string; mode?: string; resourceVerified?: boolean; cleanupStatus?: string }>
          }
          const deployedStripe = summary.checks?.find(check => check.name === "deployed-stripe")
          if (summary.providerModes?.deployedStripe !== "test" || deployedStripe?.status !== "passed"
            || deployedStripe.mode !== "test" || deployedStripe.resourceVerified !== true
            || deployedStripe.cleanupStatus !== "verified") {
            throw new Error("The deployed Stripe TEST mode and cleanup were not verified by this run's preflight")
          }
          return { mode: "test", verificationReference: "weekly-preflight:deployed-stripe:test:cleanup-verified" }
        },
        async findRouteOperation(input: { method: string; route: string }) {
          const inventoryPath = path.join(E2E_ARTIFACT_DIRECTORY, "request-inventory.json")
          const inventory = JSON.parse(await readFile(inventoryPath, "utf8")) as {
            operations: Array<{ operationId: string; operationKind: string; method?: string; route?: string; scenarioId?: string }>
          }
          const method = input.method.toUpperCase()
          const routeOperation = inventory.operations.find(operation => operation.operationKind === "http-route"
            && operation.method === method && operation.route && matchesInventoryRoute(operation.route, input.route))
          if (!routeOperation) throw new Error(`No inventory operation exists for ${input.method.toUpperCase()} ${input.route}`)
          return routeOperation
        },
        async findServiceOperation(input: { sourcePath: string; functionName: string; callName: string; fingerprint?: string; scenarioId: string }) {
          const inventoryPath = path.join(E2E_ARTIFACT_DIRECTORY, "request-inventory.json")
          const inventory = JSON.parse(await readFile(inventoryPath, "utf8")) as {
            operations: Array<{ operationId: string; operationKind: string; sourcePath: string; functionName: string; callName?: string; fingerprint?: string; scenarioId?: string }>
            asyncExpressions: Array<{ operationId: string; sourcePath: string; functionName: string; scenarioId?: string; requestOperationIds?: string[] }>
          }
          const requestOperation = inventory.operations.find(operation => operation.operationKind === "service-request"
            && operation.sourcePath === input.sourcePath && operation.functionName === input.functionName
            && operation.callName === input.callName && operation.scenarioId === input.scenarioId
            && (!input.fingerprint || operation.fingerprint === input.fingerprint))
          if (!requestOperation) throw new Error(`No reviewed service operation exists for ${input.sourcePath}:${input.functionName}:${input.callName}`)
          const asyncOperationIds = inventory.asyncExpressions.filter(operation => operation.sourcePath === input.sourcePath
            && operation.functionName === input.functionName && operation.scenarioId === input.scenarioId
            && operation.requestOperationIds?.includes(requestOperation.operationId)).map(operation => operation.operationId)
          return { operationIds: [requestOperation.operationId, ...asyncOperationIds] }
        },
        async findRealtimeOperation(input: { sourcePath: string; functionName: string; callName: string; scenarioId: string }) {
          const inventoryPath = path.join(E2E_ARTIFACT_DIRECTORY, "request-inventory.json")
          const inventory = JSON.parse(await readFile(inventoryPath, "utf8")) as {
            operations: Array<{ operationId: string; operationKind: string; sourcePath: string; functionName: string; callName?: string; scenarioId?: string }>
          }
          const realtimeOperation = inventory.operations.find(operation => operation.operationKind === "realtime-subscription"
            && operation.sourcePath === input.sourcePath && operation.functionName === input.functionName
            && operation.callName === input.callName && operation.scenarioId === input.scenarioId)
          if (!realtimeOperation) throw new Error(`No reviewed realtime operation exists for ${input.sourcePath}:${input.functionName}:${input.callName}`)
          return { operationId: realtimeOperation.operationId }
        },
        prepareRunAccounts: () => getMonthlyFixtureManager().createRunAccounts(),
        createProductFixture: (input: Parameters<ReturnType<typeof createMonthlyFixtureManager>["createProductFixture"]>[0]) =>
          getMonthlyFixtureManager().createProductFixture(input),
        recordCreatedResource: (resource: Parameters<ReturnType<typeof createMonthlyFixtureManager>["recordCreatedResource"]>[0]) =>
          getMonthlyFixtureManager().recordCreatedResource(resource),
        recordWorkerCompletion: (input: Parameters<ReturnType<typeof createMonthlyFixtureManager>["recordWorkerCompletion"]>[0]) =>
          getMonthlyFixtureManager().recordWorkerCompletion(input),
        verifyRunOwnedEmail: (input: { ownerId: string; emailId: string; subject: string; timeoutMs?: number }) =>
          getMonthlyFixtureManager().verifyRunOwnedEmail(input.ownerId, input),
        readRunProduct: (productId: string) => getMonthlyFixtureManager().readProduct(productId),
        readRunUserProfile: (ownerId: string) => getMonthlyFixtureManager().readRunUserProfile(ownerId),
        restoreRunUserLanguage: (input: { ownerId: string; language: string | null }) =>
          getMonthlyFixtureManager().restoreRunUserLanguage(input.ownerId, input.language),
        readRunCategory: (input: { ownerId: string; categoryId: string }) =>
          getMonthlyFixtureManager().readRunCategory(input),
        readRunCategoryView: (input: { ownerId: string; categoryId: string }) =>
          getMonthlyFixtureManager().readRunCategoryView(input),
        cleanupRunCategoryView: (input: { ownerId: string; categoryId: string }) =>
          getMonthlyFixtureManager().cleanupRunCategoryView(input),
        markRunCategoryCleaned: (input: { ownerId: string; categoryId: string }) =>
          getMonthlyFixtureManager().markRunCategoryCleaned(input),
        readRunSupportTicket: (input: { ticketId: string; ownerId: string }) =>
          getMonthlyFixtureManager().readRunSupportTicket(input.ticketId, input.ownerId),
        cleanupRunSupportTicket: (input: { ticketId: string; ownerId: string }) =>
          getMonthlyFixtureManager().cleanupRunSupportTicket(input),
        markRunStorageObjectCleaned: (input: { ownerId: string; reference: { provider: string; bucket: string; path: string } }) =>
          getMonthlyFixtureManager().markRunStorageObjectCleaned(input),
        readRunPersonalizedDesign: (input: { ownerId: string; userId: string; productId: string; designId: string }) =>
          getMonthlyFixtureManager().readRunPersonalizedDesign(input),
        cleanupRunPersonalizedDesign: (input: { ownerId: string; userId: string; productId: string; designId: string }) =>
          getMonthlyFixtureManager().cleanupRunPersonalizedDesign(input),
        readRunAiMemory: (ownerId: string) => getMonthlyFixtureManager().readRunAiMemory(ownerId),
        captureRunAiMemory: (ownerId: string) => getMonthlyFixtureManager().captureRunAiMemory(ownerId),
        clearRunAiMemory: (ownerId: string) => getMonthlyFixtureManager().clearRunAiMemory(ownerId),
        readRunCart: (ownerId: string) => getMonthlyFixtureManager().readRunCart(ownerId),
        waitForRunCart: (input: Parameters<ReturnType<typeof createMonthlyFixtureManager>["waitForRunCart"]>[0]) =>
          getMonthlyFixtureManager().waitForRunCart(input),
        cleanupRunCart: (ownerId: string) => getMonthlyFixtureManager().cleanupRunCart(ownerId),
        waitForTranslatedProduct: (input: { productId: string; title: string; description: string; timeoutMs?: number }) =>
          getMonthlyFixtureManager().waitForTranslatedProduct(input.productId, input),
        verifyStripeTestProduct: (input: { productId: string; priceId: string; ownerId: string; amountCents?: number; imageUrl?: string; name?: string; description?: string }) =>
          verifyStripeTestProduct(process.env, input),
        verifyStripeTestCheckoutSession: (input: {
          sessionId: string
          amountCents: number
          customerEmail: string
          expectedUserId?: string
          paymentMethodType?: string
          expectedLineItem?: { name: string; quantity: number; unitAmount: number; imageUrl?: string }
          expectedDeliveryAddress?: { formattedAddress: string; latitude: number; longitude: number }
        }) =>
          verifyStripeTestCheckoutSession(process.env, input),
        cleanupStripeTestCheckoutSession: (input: { sessionId: string; expectedCustomerEmail?: string }) =>
          cleanupStripeTestCheckoutSession(process.env, input),
        verifyStripeResourcesInactive: (input: { productId: string; priceId: string }) =>
          verifyStripeResourcesInactive(process.env, input),
        verifyStripePriceInactive: (priceId: string) => verifyStripePriceInactive(process.env, priceId),
        verifyStorageObjectAbsent: (reference: { provider: string; bucket: string; path: string }) =>
          verifyStorageObjectAbsent(process.env, reference),
        verifyStorageObjectPresent: (input: { reference: { provider: string; bucket: string; path: string }; expected: { size: number; sha256: string } }) =>
          verifyStorageObjectPresent(process.env, input.reference, input.expected),
        reservePaidOperation: realSuiteTask("reservePaidOperation", (reservation: Parameters<ReturnType<typeof createPaidBudgetManager>["reserve"]>[0]) =>
          getPaidBudgetManager().reserve(reservation)),
        settlePaidOperation: realSuiteTask("settlePaidOperation", (result: Parameters<ReturnType<typeof createPaidBudgetManager>["settle"]>[0]) =>
          getPaidBudgetManager().settle(result)),
        readPaidOperationLedger: realSuiteTask("readPaidOperationLedger", () => getPaidBudgetManager().snapshot()),
        prepareFixtures: legacyTask("prepareFixtures", prepareFixtures),
        readUTMVisits: legacyTask("readUTMVisits", readUTMVisits),
        readUTMVisitsForUserId: legacyTask("readUTMVisitsForUserId", readUTMVisitsForUserId),
        deleteUTMVisitsForUserId: legacyTask("deleteUTMVisitsForUserId", deleteUTMVisitsForUserId),
        deleteVisitsFromTodayForTestHost: legacyTask("deleteVisitsFromTodayForTestHost", deleteVisitsFromTodayForTestHost),
        readBuyingFlowEventsForSession: legacyTask("readBuyingFlowEventsForSession", readBuyingFlowEventsForSession),
        deleteBuyingFlowEventsForSession: legacyTask("deleteBuyingFlowEventsForSession", deleteBuyingFlowEventsForSession),
        prepareBuyingFlowFixtures: legacyTask("prepareBuyingFlowFixtures", getBuyingFlowFixtures),
        prepareSupportFixtures: legacyTask("prepareSupportFixtures", () => {
          preparedSupportFixturesPromise ??= prepareSupportFixtures()
          return preparedSupportFixturesPromise
        }),
        cleanupSupportFixtures: legacyTask("cleanupSupportFixtures", cleanupSupportFixtures),
        insertProductWithRls: legacyTask("insertProductWithRls", async ({
          account,
          product,
        }: {
          account: { email: string; password: string }
          product: Database["public"]["Tables"]["23_products"]["Insert"]
        }) => {
          const supabase = getSupabaseRlsClient()
          const { error: signInError } = await supabase.auth.signInWithPassword(account)
          if (signInError) return { product: null, error: signInError.message }

          const { data, error } = await supabase.from("23_products").insert(product).select("*").single()
          await supabase.auth.signOut()
          return { product: data, error: error?.message ?? null }
        }),
        readProduct: legacyTask("readProduct", async (productId: string) => {
          const supabase = getSupabaseTestClient()
          const { data, error } = await supabase.from("23_products").select("*").eq("id", productId).maybeSingle()
          if (error) throw error
          return data
        }),
      })

      return cypressConfig
    },
  },
})
