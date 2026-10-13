import assert from "node:assert/strict"
import test from "node:test"

import ts from "typescript"

import {
  getExecutionForm,
  getSupabaseQueryDescriptor,
  isNetworkCall,
  isPrivateEnvironmentFileName,
} from "../../scripts/e2e/inventory-requests.mjs"

test("private local environment filenames are excluded from source discovery", () => {
  assert.equal(isPrivateEnvironmentFileName(".env.local"), true)
  assert.equal(isPrivateEnvironmentFileName(".env.local.backup.ts"), true)
  assert.equal(isPrivateEnvironmentFileName(".env.example"), false)
  assert.equal(isPrivateEnvironmentFileName("environment.local.ts"), false)
})

test("request scanner distinguishes awaited, returned, background, chained and Promise.all calls", () => {
  const source = `
    async function sample() {
      await fetch("/awaited")
      return fetch("/returned")
      void fetch("/background")
      fetch("/chained").then(handle)
      await Promise.all([fetch("/parallel-a"), fetch("/parallel-b")])
    }
  `
  const sourceFile = ts.createSourceFile("sample.ts", source, ts.ScriptTarget.Latest, true)
  const calls = []
  function visit(node) {
    if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === "fetch") calls.push(node)
    node.forEachChild(visit)
  }
  visit(sourceFile)

  assert.equal(calls.length, 6)
  assert.deepEqual(calls.map(call => getExecutionForm(call)), ["await", "return", "void", "then", "promise-all", "promise-all"])
  assert.ok(calls.every(call => isNetworkCall(call, source)))
})

test("Supabase query chains are labeled by their database action rather than builder tail", () => {
  const source = `
    async function updateProduct(supabase, productId, values) {
      return supabase.from("23_products").update(values).eq("id", productId).select().single()
    }
  `
  const sourceFile = ts.createSourceFile("sample.ts", source, ts.ScriptTarget.Latest, true)
  let terminalCall = null
  function visit(node) {
    if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression)
      && node.expression.name.text === "single") terminalCall = node
    node.forEachChild(visit)
  }
  visit(sourceFile)

  assert.deepEqual(getSupabaseQueryDescriptor(terminalCall), {
    callName: "supabase-update",
    queryAction: "update",
  })
  assert.equal(isNetworkCall(terminalCall, source), true)
})
