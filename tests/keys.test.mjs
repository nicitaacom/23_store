/**
 * Are the API keys in .env.local still valid?
 *
 * Run it with `pnpm test:keys`. It is not a unit test - every "live" name here sends a real request to
 * Stripe, Supabase, Pusher and the rest, so it also fails while one of those has an outage. That is
 * why `.githooks/pre-push` prints the failing names and lets the push through instead of stopping it.
 *
 * See app/api/webhooks/check-envs/dev_readme-check-env.md.
 */
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import path from "node:path"
import { before, describe, it } from "node:test"
import { fileURLToPath } from "node:url"

import { formatKeyProgressLine, KEY_PROBES, runKeyChecks } from "../app/utils/checkEnvs.ts"

const REPO_DIRECTORY = path.join(path.dirname(fileURLToPath(import.meta.url)), "..")
const WHOLE_RUN_TIMEOUT_MS = 120000
const DOTENV_NAME_PATTERN = /^\s*([A-Z][A-Z0-9_]*)\s*=/
const DECLARATION_NAME_PATTERN = /^\s*([A-Z][A-Z0-9_]*)\s*:\s*(?:string|number|boolean)\s*$/

function readNames(fileName, pattern) {
  let fileText
  try {
    fileText = readFileSync(path.join(REPO_DIRECTORY, fileName), "utf8")
  } catch {
    return null
  }

  const names = fileText
    .split("\n")
    .map(line => line.match(pattern)?.[1])
    .filter(Boolean)

  return new Set(names)
}

describe("every name declared in the project is in the registry", () => {
  const registryNames = new Set(KEY_PROBES.map(probe => probe.name))

  it("app/utils/checkEnvs.ts lists every name in env.d.ts", () => {
    const declaredNames = readNames("env.d.ts", DECLARATION_NAME_PATTERN)
    assert.ok(declaredNames, "env.d.ts was not found next to this test")

    const missing = [...declaredNames].filter(name => !registryNames.has(name))
    assert.deepEqual(missing, [], `declared in env.d.ts but missing from app/utils/checkEnvs.ts: ${missing.join(", ")}`)
  })

  it("app/utils/checkEnvs.ts lists every name in .env.example", () => {
    const exampleNames = readNames(".env.example", DOTENV_NAME_PATTERN)
    assert.ok(exampleNames, ".env.example was not found next to this test")

    const missing = [...exampleNames].filter(name => !registryNames.has(name))
    assert.deepEqual(missing, [], `declared in .env.example but missing from app/utils/checkEnvs.ts: ${missing.join(", ")}`)
  })

  it("every registry name is declared in env.d.ts", () => {
    const declaredNames = readNames("env.d.ts", DECLARATION_NAME_PATTERN)
    assert.ok(declaredNames, "env.d.ts was not found next to this test")

    const undeclared = [...registryNames].filter(name => !declaredNames.has(name))
    assert.deepEqual(undeclared, [], `in app/utils/checkEnvs.ts but never declared in env.d.ts: ${undeclared.join(", ")}`)
  })
})

describe("every key in .env.local still works", () => {
  let report

  before(
    async () => {
      process.stderr.write(`\nchecking ${KEY_PROBES.length} names — every "live" one sends a real request\n`)

      report = await runKeyChecks(KEY_PROBES, (...progress) => process.stderr.write(formatKeyProgressLine(...progress)))

      if (report.ok) return

      process.stderr.write(`\n${report.failures.length} names need you:\n`)
      for (const failure of report.failures) process.stderr.write(`  ✘ ${failure.name} — ${failure.reason}\n`)
      process.stderr.write("\n")
    },
    { timeout: WHOLE_RUN_TIMEOUT_MS },
  )

  for (const probe of KEY_PROBES) {
    it(`${probe.name} — ${probe.tier}`, () => {
      const failure = report.failures.find(candidate => candidate.name === probe.name)
      assert.equal(failure, undefined, `${probe.name} — ${failure?.reason}`)
    })
  }
})
