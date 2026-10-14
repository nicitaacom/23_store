import assert from "node:assert/strict"
import { spawnSync } from "node:child_process"
import { mkdtemp, readFile, rm } from "node:fs/promises"
import os from "node:os"
import path from "node:path"
import test from "node:test"
import { fileURLToPath } from "node:url"

import { buildPreflight, describeProviderCallPlan } from "../../scripts/e2e/preflight.mjs"

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

test("provider actions use production configuration without a separate dollar budget", () => {
  const callPlan = describeProviderCallPlan({ capabilities: [
    { name: "image generation", scenarioId: "ai-tools" },
    { name: "field translation", scenarioId: "product-background" },
  ] })

  assert.deepEqual(callPlan.capabilities, [
    { name: "image generation", scenarioId: "ai-tools" },
    { name: "field translation", scenarioId: "product-background" },
  ])
  assert.match(callPlan.policy, /records real provider attempts/)
})

test("weekly command records missing target in preflight instead of exiting before its report", async () => {
  const artifactDirectory = await mkdtemp(path.join(os.tmpdir(), "23-store-e2e-preflight-"))

  try {
    const result = spawnSync(process.execPath, ["scripts/e2e/run-weekly.mjs"], {
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
