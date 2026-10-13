import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import test from "node:test"

const workflowPath = new URL("../../.github/workflows/cypress-monthly.yml", import.meta.url)
const readmePath = new URL("../../dev_readme-cypress-weekly.md", import.meta.url)

test("real-service browser workflow runs monthly only and skips repeated attempts", async () => {
  const workflow = await readFile(workflowPath, "utf8")
  const triggerBlock = workflow.match(/^on:\n((?:[ \t].*\n)*)/m)?.[1]
  assert.ok(triggerBlock, "workflow trigger block exists")
  assert.deepEqual([...triggerBlock.matchAll(/^  ([a-z_]+):/gm)].map(match => match[1]), ["schedule"])
  assert.match(triggerBlock, /^    - cron: "23 3 1 \* \*"$/m)
  assert.match(workflow, /^  production-monthly:\n(?:.*\n)*?    if: github\.run_attempt == 1$/m)
  assert.match(workflow, /^    timeout-minutes: 60$/m)
  assert.match(workflow, /^concurrency:\n  group: 23-store-monthly-real-service-tests\n  cancel-in-progress: false$/m)

  const readme = await readFile(readmePath, "utf8")
  assert.match(readme, /once on the first day of each month/i)
  assert.match(readme, /free-tier notice: 1,807 of 2,000 included minutes/i)
  assert.match(readme, /redeployment,?\s*manual, or external trigger/i)
})
