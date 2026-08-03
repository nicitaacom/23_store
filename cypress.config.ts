import { config as readEnvironment } from "dotenv"
import { defineConfig } from "cypress"
import { createClient, User } from "@supabase/supabase-js"

import { decodeDeviceId, isValidDeviceId } from "./app/utils/deviceId"
import type { Database, Json } from "./app/ts/types_db"

readEnvironment({ path: ".env.local" })

const LOCAL_DEV_URL = "http://localhost:3023"

// The target the whole suite runs against. Same source the app uses for its own URL in
// app/[locale]/layout.tsx: the deployed URL comes from NEXT_PUBLIC_PRODUCTION_URL, and a local run
// targets the port package.json's `dev` script serves on.
// Read through a function so the value is typed `string` everywhere: on TS 5.2 an outer-scope
// `if (!value) throw` still leaves the type `string | undefined` inside the task functions below.
function getE2EBaseUrl(): string {
  const baseUrl = process.env.NODE_ENV === "production" ? process.env.NEXT_PUBLIC_PRODUCTION_URL : LOCAL_DEV_URL
  if (!baseUrl) throw new Error("Cypress requires NEXT_PUBLIC_PRODUCTION_URL when NODE_ENV is production")

  return baseUrl
}

const E2E_BASE_URL = getE2EBaseUrl()

const TEST_PASSWORD = "CypressTest1#Secure"
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
}

let preparedAccountsPromise: Promise<{
  owner: Awaited<ReturnType<typeof ensureAccount>>
  other: Awaited<ReturnType<typeof ensureAccount>>
}> | null = null
let preparedBuyingFlowFixturesPromise: Promise<Awaited<ReturnType<typeof prepareBuyingFlowFixtures>>> | null = null

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
  const supabase = getSupabaseTestClient()
  const findUserByEmailResp = await findUserByEmail(account.email)
  let user: User | null = findUserByEmailResp

  if (user) {
    const { data, error } = await supabase.auth.admin.updateUserById(user.id, {
      password: TEST_PASSWORD,
      email_confirm: true,
      user_metadata: { username: account.username },
    })
    if (error) throw error
    user = data.user
  } else {
    const { data, error } = await supabase.auth.admin.createUser({
      email: account.email,
      password: TEST_PASSWORD,
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
  })
  if (publicUserError) throw publicUserError

  const { error: cartError } = await supabase.from("23_users_cart").upsert({ id: user.id, cart_products: {} })
  if (cartError) throw cartError

  return { id: user.id, email: account.email, password: TEST_PASSWORD }
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
 * The host comes from E2E_BASE_URL, and the guard below keeps this to a loopback target: pointing the
 * suite at a deployed URL would otherwise let a bulk delete reach real visit rows.
 */
async function deleteVisitsFromTodayForTestTarget() {
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

async function getBuyingFlowFixtures() {
  preparedBuyingFlowFixturesPromise ??= prepareBuyingFlowFixtures()
  return preparedBuyingFlowFixturesPromise
}

export default defineConfig({
  allowCypressEnv: false,
  e2e: {
    baseUrl: E2E_BASE_URL,
    experimentalWebKitSupport: true,
    specPattern: "cypress/e2e/**/*.cy.{ts,tsx}",
    supportFile: "cypress/support/e2e.ts",
    video: false,
    screenshotOnRunFailure: true,
    defaultCommandTimeout: 10000,
    requestTimeout: 10000,
    responseTimeout: 20000,
    setupNodeEvents(on, cypressConfig) {
      on("task", {
        prepareFixtures,
        readUTMVisits,
        readUTMVisitsForUserId,
        deleteUTMVisitsForUserId,
        deleteVisitsFromTodayForTestTarget,
        readBuyingFlowEventsForSession,
        deleteBuyingFlowEventsForSession,
        prepareBuyingFlowFixtures: getBuyingFlowFixtures,
        async insertProductWithRls({
          account,
          product,
        }: {
          account: { email: string; password: string }
          product: Database["public"]["Tables"]["23_products"]["Insert"]
        }) {
          const supabase = getSupabaseRlsClient()
          const { error: signInError } = await supabase.auth.signInWithPassword(account)
          if (signInError) return { product: null, error: signInError.message }

          const { data, error } = await supabase.from("23_products").insert(product).select("*").single()
          await supabase.auth.signOut()
          return { product: data, error: error?.message ?? null }
        },
        async readProduct(productId: string) {
          const supabase = getSupabaseTestClient()
          const { data, error } = await supabase.from("23_products").select("*").eq("id", productId).maybeSingle()
          if (error) throw error
          return data
        },
      })

      return cypressConfig
    },
  },
})
