import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import test from "node:test"

import { MONTHLY_CRON } from "../../scripts/e2e/weekly-schedule.mjs"

const removedWeeklyWorkflow = new URL("../../.github/workflows/cypress-weekly.yml", import.meta.url)
const workflowPath = new URL("../../.github/workflows/cypress-monthly.yml", import.meta.url)
const composePath = new URL("../../docker/e2e-weekly/docker-compose.yml", import.meta.url)
const readmePath = new URL("../../dev_readme-cypress-weekly.md", import.meta.url)

test("monthly real-service checks run from GitHub Actions on the 1st at 03:23 UTC", async () => {
  await assert.rejects(readFile(removedWeeklyWorkflow))
  const workflow = await readFile(workflowPath, "utf8")
  assert.equal(MONTHLY_CRON, "23 3 1 * *")
  assert.match(workflow, /cron: "23 3 1 \* \*"/)
  assert.doesNotMatch(workflow, /23 3 \* \* 1/)
  assert.match(workflow, /workflow_dispatch:/)
  assert.match(workflow, /run-monthly-once/)
  assert.doesNotMatch(workflow, /pull_request:|push:/)

  const compose = await readFile(composePath, "utf8")
  assert.match(compose, /image: postgres:15-alpine/)
  assert.match(compose, /image: supabase\/gotrue:/)
  assert.match(compose, /image: redis:7-alpine/)
  assert.match(compose, /image: hiett\/serverless-redis-http:/)
  assert.doesNotMatch(compose, /^  clock:/m)
  assert.doesNotMatch(compose, /github/)

  const readme = await readFile(readmePath, "utf8")
  assert.match(readme, /03:23 UTC on the 1st of each month/)
  assert.match(readme, /GitHub Actions/)
  assert.match(readme, /no push, PR, or deployment trigger/i)
  assert.match(readme, /run-monthly-once/)
  assert.doesNotMatch(readme, /GitHub Actions is not used/i)
})
