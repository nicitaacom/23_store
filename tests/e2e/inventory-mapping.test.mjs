import assert from "node:assert/strict"
import { spawnSync } from "node:child_process"
import { mkdtemp, readFile, rm } from "node:fs/promises"
import os from "node:os"
import path from "node:path"
import test from "node:test"
import { fileURLToPath } from "node:url"

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..")

test("every discovered request and async expression has a reviewed scenario mapping", async () => {
  const artifactDirectory = await mkdtemp(path.join(os.tmpdir(), "23-store-inventory-"))
  try {
    const result = spawnSync(process.execPath, ["scripts/e2e/inventory-requests.mjs"], {
      cwd: repositoryRoot,
      env: { PATH: "/usr/bin:/bin", E2E_ARTIFACT_DIR: artifactDirectory },
      encoding: "utf8",
      timeout: 120000,
    })
    assert.equal(result.status, 0, result.stderr || result.stdout)
    const inventory = JSON.parse(await readFile(path.join(artifactDirectory, "request-inventory.json"), "utf8"))
    assert.equal(inventory.unmappedCount, 0)
    assert.equal(inventory.unmappedAsyncCount, 0)
    assert.equal(inventory.unclassifiedAsyncCount, 0)
    assert.equal(inventory.dependencyReviewCount, 0)
    assert.ok(inventory.operationCount > 0)
    assert.ok(inventory.asyncExpressionCount > 0)
  } finally {
    await rm(artifactDirectory, { recursive: true, force: true })
  }
})
