import assert from "node:assert/strict"
import { test } from "node:test"
import { mkdtemp, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import path from "node:path"

process.env.NEXT_PUBLIC_SUPABASE_URL = "https://source.example"
process.env.SUPABASE_SERVICE_ROLE_KEY = "fixture-service-role"
process.env.NEXT_PUBLIC_R2_PUBLIC_URL = "https://files.example"
const { rewriteVerifiedReferences, applyReferenceChange, revertReferenceJournal } = await import("./references.mjs")

test("nested verified references change providers while external and unverified URLs stay intact", () => {
  const source = "https://source.example/storage/v1/object/public/23_product-images/owner/product/file.png"
  const external = "https://unrelated.example/23_product-images/owner/product/file.png"
  const unverified = "https://source.example/storage/v1/object/public/23_avatar-images/owner/missing.png"
  const value = { img_url: [source, external], variants: [{ image_url: source }], personalization: { source_url: unverified } }
  const result = rewriteVerifiedReferences(value, new Set(["23_product-images/owner/product/file.png"]), "supabase", "r2")
  assert.equal(result.img_url[0], "https://files.example/23_product-images/owner/product/file.png")
  assert.equal(result.variants[0].image_url, result.img_url[0])
  assert.equal(result.img_url[1], external); assert.equal(result.personalization.source_url, unverified)
  assert.deepEqual(rewriteVerifiedReferences(result, new Set(["23_product-images/owner/product/file.png"]), "supabase", "r2"), result)
})

test("reference updates report concurrent edits without overwriting them", async () => {
  let actual = ["concurrently changed"]
  const client = { rpc: async (_name, input) => ({ data: JSON.stringify(actual) === JSON.stringify(input.before_values.img_url), error: null }) }
  const changed = await applyReferenceChange(client, { table: "23_products", rowKey: { id: "prod_1" }, before: { img_url: ["old"] }, after: { img_url: ["new"] } })
  assert.equal(changed, false); assert.deepEqual(actual, ["concurrently changed"])
})

test("journal reversal uses exact before/after comparisons and preserves current edits", async t => {
  const folder = await mkdtemp(path.join(tmpdir(), "23-reference-test-")); t.after(() => rm(folder, { recursive: true, force: true }))
  const journal = path.join(folder, "references.jsonl")
  const record = { id: "change-1", table: "23_users", rowKey: { id: "user" }, before: { avatar_url: "old" }, after: { avatar_url: "new" }, status: "complete" }
  await writeFile(journal, [JSON.stringify({ ...record, status: "planned" }), JSON.stringify(record)].join("\n"))
  let received
  const client = { rpc: async (_name, input) => { received = input; return { data: true, error: null } } }
  assert.equal((await revertReferenceJournal(journal, true, client)).planned, 1)
  assert.deepEqual(received.before_values, record.after); assert.deepEqual(received.after_values, record.before)
  await assert.rejects(revertReferenceJournal(journal, true, { rpc: async () => ({ data: false, error: null }) }), /preserved/)
})
