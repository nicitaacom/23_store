import { config as readEnvironment } from "dotenv"
import { defineConfig } from "cypress"
import { createClient, User } from "@supabase/supabase-js"

import type { Database, Json } from "./app/ts/types_db"

readEnvironment({ path: ".env.local" })

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
}

let preparedAccountsPromise: Promise<{
  owner: Awaited<ReturnType<typeof ensureAccount>>
  other: Awaited<ReturnType<typeof ensureAccount>>
}> | null = null

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

export default defineConfig({
  allowCypressEnv: false,
  e2e: {
    baseUrl: "http://localhost:3023",
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
