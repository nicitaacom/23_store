"use strict"

const assert = require("node:assert/strict")
const test = require("node:test")
const { Linter } = require("eslint")

const rule = require("./use-rls-supabase-client")

function verify(code, filename) {
  const linter = new Linter({ configType: "flat" })

  return linter.verify(
    code,
    [
      {
        files: ["**/*.ts"],
        languageOptions: { ecmaVersion: 2022, sourceType: "module" },
        plugins: { local: { rules: rule } },
        rules: { "local/use-rls-supabase-client": "error" },
      },
    ],
    { filename },
  )
}

test("reports supabaseAdmin database access in an API route", () => {
  const messages = verify(
    `
      import supabaseAdmin from "@/libs/supabase/supabaseAdmin"
      export async function POST() {
        return supabaseAdmin.from("23_products").insert({ owner_id: "another-user" })
      }
    `,
    "app/api/products/route.ts",
  )

  assert.equal(messages.length, 1)
  assert.equal(messages[0].messageId, "useRlsClient")
})

test("reports an aliased supabaseAdmin database client in a server action", () => {
  const messages = verify(
    `
      import { supabaseAdmin as serviceClient } from "@/libs/supabase/supabaseAdmin"
      const databaseClient = serviceClient
      export async function updateProductAction() {
        return databaseClient.from("23_products").update({ on_stock: 2 })
      }
    `,
    "app/actions/updateProductAction.ts",
  )

  assert.equal(messages.length, 1)
})

test("allows cookie-aware clients in request-bound files", () => {
  const messages = verify(
    `
      import supabaseServer from "@/libs/supabase/supabaseServer"
      import { supabaseRouteHandler } from "@/libs/supabase/supabaseRouteHandler"
      export async function POST() {
        const routeClient = await supabaseRouteHandler()
        const serverClient = await supabaseServer()
        await routeClient.from("23_products").delete().eq("id", "product-id")
        return serverClient.from("23_products").select("*")
      }
    `,
    "app/api/products/route.ts",
  )

  assert.deepEqual(messages, [])
})

test("allows supabaseAdmin Auth and Storage operations", () => {
  const messages = verify(
    `
      import supabaseAdmin from "@/libs/supabase/supabaseAdmin"
      export async function POST() {
        await supabaseAdmin.auth.admin.listUsers()
        return supabaseAdmin.storage.from("images").createSignedUploadUrl("path")
      }
    `,
    "app/api/admin/route.ts",
  )

  assert.deepEqual(messages, [])
})

test("allows explicit service-role database work outside request-bound files", () => {
  const messages = verify(
    `
      import supabaseAdmin from "@/libs/supabase/supabaseAdmin"
      export async function runScheduledBackup() {
        return supabaseAdmin.from("23_products").select("*")
      }
    `,
    "scripts/runScheduledBackup.ts",
  )

  assert.deepEqual(messages, [])
})
