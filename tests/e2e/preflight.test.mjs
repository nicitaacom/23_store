import assert from "node:assert/strict"
import { spawnSync } from "node:child_process"
import { mkdtemp, readFile, rm } from "node:fs/promises"
import os from "node:os"
import path from "node:path"
import test from "node:test"
import { fileURLToPath } from "node:url"

import { buildPreflight, validatePaidCapabilityBudget } from "../../scripts/e2e/preflight.mjs"

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..")

test("incomplete local setup stops before contacting production or providers", async () => {
  const preflight = await buildPreflight({})

  assert.equal(preflight.status, "INCOMPLETE")
  assert.ok(preflight.missingSettings.includes("NEXT_PUBLIC_PRODUCTION_URL"))
  assert.deepEqual(preflight.missingSpecs, [])
  assert.ok(preflight.blockers.some(blocker => blocker.startsWith("Missing required setting:")))
  assert.ok(preflight.checks.every(check => check.status === "blocked_by_configuration"
    && check.detail.includes("no remote request was made")))
  assert.equal(preflight.operationCounts.executed, 0)
  assert.equal(preflight.operationCounts.unexercised, preflight.operationCounts.discovered)
})

test("paid budget preflight multiplies per-call estimates by the full configured call count", () => {
  const blockers = []
  const budget = validatePaidCapabilityBudget({
    E2E_OPERATION_COST_ESTIMATES_JSON: JSON.stringify({ image_call: 0.25 }),
    E2E_IMAGE_CALLS: "4",
    E2E_MAX_PROVIDER_COST_USD: "0.9",
    E2E_MAX_PAID_OPERATIONS: "3",
    E2E_REPORT_FROM: "e2e-test-23-store@nicitaa.com",
    E2E_REPORT_TO: "support@nicitaa.com",
  }, { capabilities: [{
    name: "image",
    estimateName: "image_call",
    callCountSetting: "E2E_IMAGE_CALLS",
    minimumProviderCalls: 1,
  }] }, blockers)

  assert.equal(budget.estimatedCostUsd, 1)
  assert.equal(budget.maxProviderCalls, 4)
  assert.ok(blockers.some(blocker => blocker.includes("Paid capability estimates total $1.0000")))
  assert.ok(blockers.some(blocker => blocker.includes("Paid capability call limits total 4")))
})

test("monthly command records missing target in preflight instead of exiting before its report", async () => {
  const artifactDirectory = await mkdtemp(path.join(os.tmpdir(), "23-store-e2e-preflight-"))

  try {
    const result = spawnSync(process.execPath, ["scripts/e2e/run-monthly.mjs"], {
      cwd: repositoryRoot,
      env: { PATH: "/usr/bin:/bin", E2E_ARTIFACT_DIR: artifactDirectory },
      encoding: "utf8",
      timeout: 30000,
    })

    assert.equal(result.error, undefined, result.error?.message)
    assert.equal(result.status, 2, result.stderr)

    const summary = JSON.parse(await readFile(path.join(artifactDirectory, "summary.json"), "utf8"))
    assert.equal(summary.status, "INCOMPLETE")
    assert.ok(summary.missingSettings.includes("NEXT_PUBLIC_PRODUCTION_URL"))
    assert.ok(summary.checks.every(check => check.status === "blocked_by_configuration"
      && check.detail.includes("no remote request was made")))
  } finally {
    await rm(artifactDirectory, { recursive: true, force: true })
  }
})
