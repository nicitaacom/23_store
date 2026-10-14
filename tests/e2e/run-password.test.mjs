import assert from "node:assert/strict"
import test from "node:test"

import { deriveRunTestPassword } from "../../scripts/e2e/run-password.mjs"

test("run account password is reproducible only for the same service key and run id", () => {
  const firstPassword = deriveRunTestPassword("service-key-one", "weekly-run-101")

  assert.equal(firstPassword, deriveRunTestPassword("service-key-one", "weekly-run-101"))
  assert.notEqual(firstPassword, deriveRunTestPassword("service-key-one", "weekly-run-102"))
  assert.notEqual(firstPassword, deriveRunTestPassword("service-key-two", "weekly-run-101"))
  assert.ok(firstPassword.length >= 16)
  assert.notEqual(firstPassword, "service-key-one")
})
