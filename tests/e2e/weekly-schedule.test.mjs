import assert from "node:assert/strict"
import { mkdtemp, stat, utimes, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import path from "node:path"
import test from "node:test"

import { readOrCreateStackEnv, signRoleJwt } from "../../scripts/e2e/local-data-stack.mjs"
import {
  ARTIFACT_KEEP_MS,
  decideMonthlyFire,
  MONTHLY_CRON,
  MONTHLY_TIMEOUT_MS,
  nextMonthlyFire,
  pruneOldFiles,
} from "../../scripts/e2e/weekly-schedule.mjs"

test("monthly fire is 03:23 UTC on the 1st and the next one is the following month", () => {
  assert.equal(MONTHLY_CRON, "23 3 1 * *")
  assert.equal(MONTHLY_TIMEOUT_MS, 60 * 60 * 1000)
  assert.equal(ARTIFACT_KEEP_MS, 14 * 24 * 60 * 60 * 1000)
  assert.equal(nextMonthlyFire(new Date("2026-10-22T12:00:00Z")).toISOString(), "2026-11-01T03:23:00.000Z")
  assert.equal(nextMonthlyFire(new Date("2026-10-01T03:22:00Z")).toISOString(), "2026-10-01T03:23:00.000Z")
  assert.equal(nextMonthlyFire(new Date("2026-10-01T03:23:30Z")).toISOString(), "2026-11-01T03:23:00.000Z")
  assert.equal(nextMonthlyFire(new Date("2026-12-31T23:00:00Z")).toISOString(), "2027-01-01T03:23:00.000Z")
})

test("a second start in the same month does not repeat the suite", () => {
  const now = new Date("2026-11-01T03:23:10Z")
  assert.equal(decideMonthlyFire({ now }).action, "run")
  assert.deepEqual(decideMonthlyFire({ now, lastWindowId: "2026-11" }), {
    action: "skip",
    reason: "already-fired",
    windowId: "2026-11",
  })
  assert.equal(decideMonthlyFire({ now, lockStartedAt: now.getTime() - 60_000 }).action, "skip")
  assert.equal(decideMonthlyFire({ now, lockStartedAt: now.getTime() - MONTHLY_TIMEOUT_MS - 1 }).action, "run")
  assert.equal(decideMonthlyFire({ now: new Date("2026-10-22T12:00:00Z") }).action, "wait")
})

test("files older than 14 days are removed and the window record stays", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "monthly-prune-"))
  const oldFile = path.join(directory, "old.json")
  const keptFile = path.join(directory, "monthly-window.json")
  await writeFile(oldFile, "{}\n")
  await writeFile(keptFile, "{}\n")
  const oldSeconds = Math.floor((Date.now() - ARTIFACT_KEEP_MS - 86_400_000) / 1000)
  await utimes(oldFile, oldSeconds, oldSeconds)
  await utimes(keptFile, oldSeconds, oldSeconds)
  assert.equal(await pruneOldFiles(directory, Date.now()), 1)
  await assert.rejects(stat(oldFile))
  await stat(keptFile)
})

test("stack secrets keep the same password on the next read", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "monthly-stack-"))
  const filePath = path.join(directory, "stack.env")
  const created = await readOrCreateStackEnv(filePath)
  const reread = await readOrCreateStackEnv(filePath)
  assert.equal(reread.POSTGRES_PASSWORD, created.POSTGRES_PASSWORD)
  assert.equal(reread.ANON_KEY, created.ANON_KEY)
  const payload = JSON.parse(Buffer.from(signRoleJwt("service_role", "secret", 1_700_000_000).split(".")[1], "base64url").toString())
  assert.equal(payload.role, "service_role")
  assert.equal(created.ANON_KEY.split(".").length, 3)
})
