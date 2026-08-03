/**
 * What `.githooks/pre-push` runs. Same probes as `pnpm test:keys`, behind the every-3-days guard.
 *
 * Two things it deliberately does NOT do:
 *
 *   1. It never stops a push. Around 100 commits a day go through here, and a third party having a
 *      500 for ten minutes is not a reason to block your work. It prints the names and steps aside.
 *   2. It never writes the stamp after a failing run, so the very next push tries again instead of
 *      waiting three more days on a key you already know is broken.
 *
 * See app/api/webhooks/check-envs/dev_readme-check-env.md.
 */
import { readFileSync, writeFileSync } from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

import { formatKeyProgressLine, PUSH_CHECK_EVERY_DAYS, runKeyChecks } from "../app/utils/checkKeys.ts"

const REPO_DIRECTORY = path.join(path.dirname(fileURLToPath(import.meta.url)), "..")
// inside .git, so it needs no .gitignore line and no fresh clone ever inherits a stale one
const STAMP_FILE = path.join(REPO_DIRECTORY, ".git", "keys-check-stamp")
const MS_PER_DAY = 24 * 60 * 60 * 1000

function readDaysSinceLastGreenRun() {
  try {
    const stampedAt = Date.parse(readFileSync(STAMP_FILE, "utf8").trim())

    return Number.isNaN(stampedAt) ? null : (Date.now() - stampedAt) / MS_PER_DAY
  } catch {
    return null
  }
}

const daysSince = readDaysSinceLastGreenRun()
if (daysSince !== null && daysSince < PUSH_CHECK_EVERY_DAYS) {
  const daysRounded = Math.floor(daysSince)
  const ago = daysRounded === 0 ? "today" : `${daysRounded}d ago`
  process.stderr.write(`pre-push: keys checked ${ago}, next check in ${PUSH_CHECK_EVERY_DAYS} days\n`)
  process.exit(0)
}

process.stderr.write("pre-push: checking every API key in .env.local\n")
const report = await runKeyChecks(undefined, (...progress) => process.stderr.write(formatKeyProgressLine(...progress)))

if (report.ok) {
  writeFileSync(STAMP_FILE, `${report.ranAt}\n`)
  process.stderr.write(`pre-push: all ${report.liveCount + report.shapeCount + report.skipCount} names OK\n`)
  process.exit(0)
}

process.stderr.write(`\npre-push: ${report.failures.length} names need you — pushing anyway\n`)
for (const failure of report.failures) process.stderr.write(`  ✘ ${failure.name} — ${failure.reason}\n`)
process.stderr.write("\nNot writing the stamp, so your next push checks again.\n\n")
process.exit(0)
