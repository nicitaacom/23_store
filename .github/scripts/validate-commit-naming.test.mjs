import assert from "node:assert/strict"
import { spawnSync } from "node:child_process"
import { mkdtempSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import path from "node:path"
import test from "node:test"
import { fileURLToPath } from "node:url"

import { selectIntroducedCommits, validateCommitText, validatePullRequest } from "./validate-commit-naming.mjs"

const repoRoot = fileURLToPath(new URL("../../", import.meta.url))

test("accepts every allowed commit type", () => {
  for (const type of ["fix", "upd", "style", "docs", "feat", "chore"]) {
    assert.deepEqual(validateCommitText(`${type}: valid message`), [])
  }
})

test("accepts the removal prefix for every allowed commit type", () => {
  for (const type of ["fix", "upd", "style", "docs", "feat", "chore"]) {
    assert.deepEqual(validateCommitText(`-${type}: remove existing code`), [])
    assert.deepEqual(validateCommitText(`-${type}: remove existing code`, "pull request title"), [])
  }
})

test("accepts UI as an acronym while keeping the rest of the message lowercase", () => {
  assert.deepEqual(validateCommitText("-docs: UI buying flow"), [])
  assert.deepEqual(validateCommitText("-upd: UI buying flow"), [])
  assert.deepEqual(validateCommitText("docs: UI buying flow", "pull request title"), [])
  assert.match(validateCommitText("-docs: UI Buying flow").join("\n"), /lowercase/)
  assert.match(validateCommitText("-docs: ui BUYING flow").join("\n"), /lowercase/)
})

test("rejects invalid subject shapes", () => {
  assert.match(validateCommitText("feat(scope): message").join("\n"), /scope/)
  assert.match(validateCommitText("feature: message").join("\n"), /type/)
  assert.match(validateCommitText("feat: Uppercase message").join("\n"), /lowercase/)
  assert.match(validateCommitText("feat: message.").join("\n"), /period/)
  assert.match(validateCommitText("-upd(scope): message").join("\n"), /scope/)
  assert.match(validateCommitText("-test: message").join("\n"), /type/)
  assert.match(validateCommitText("--docs: message").join("\n"), /type/)
  assert.match(validateCommitText("-docs:").join("\n"), /lowercase message/)
  assert.match(validateCommitText("-docs: UI buying flow.").join("\n"), /period/)
})

test("accepts the descriptions required by commit-patterns.md", () => {
  const description = "feat: message\n\n🚨 TODO\n\n1. Vercel -> Environment Variables -> add the production credential -> redeploy\n\n- preserve existing behavior"
  assert.deepEqual(validateCommitText(description), [])
  assert.deepEqual(validateCommitText(description, "commit abc123"), [])
})

test("keeps pull request titles on one line", () => {
  assert.match(validateCommitText("feat: message\n\nextra details", "pull request title").join("\n"), /one line/)
})

test("accepts the user's Merge branch exception for commit subjects", () => {
  const merge = "Merge branch 'feat/storybook' into development"
  assert.deepEqual(validateCommitText(merge), [])
  assert.deepEqual(validateCommitText(`${merge}\n\n- retain merge details`, "commit abc123"), [])
  assert.match(validateCommitText(merge, "pull request title").join("\n"), /lowercase message/)
})

test("reads only non-merge commits in the pull request range", () => {
  const runGit = (command, arguments_) => {
    assert.equal(command, "git")
    assert.deepEqual(arguments_, ["log", "--no-merges", "-z", "--format=%H%x1f%B", "base..head"])
    return "abc123\u001ffeat: current change\n\0"
  }

  assert.deepEqual(selectIntroducedCommits("base", "head", runGit), [
    { sha: "abc123", text: "feat: current change\n" },
  ])
})

test("validates the pull request title and introduced commits", () => {
  const errors = validatePullRequest({
    baseSha: "base",
    headSha: "head",
    pullRequestTitle: "Feat: invalid title",
    runGit: () => "abc123\u001ffeat: valid commit\n\0def456\u001ffix: invalid period.\n\0",
  })

  assert.match(errors.join("\n"), /pull request title/)
  assert.match(errors.join("\n"), /commit def456/)
})

test("accepts introduced commits with required descriptions", () => {
  assert.deepEqual(validatePullRequest({
    baseSha: "base",
    headSha: "head",
    pullRequestTitle: "feat: valid title",
    runGit: () => "abc123\u001ffeat: valid commit\n\n- explain the change\n\0",
  }), [])
})

test("skips commit history when the event has no usable range", () => {
  let gitWasRead = false
  const runGit = () => {
    gitWasRead = true
    return ""
  }

  assert.deepEqual(selectIntroducedCommits("", "head", runGit), [])
  assert.deepEqual(selectIntroducedCommits("000000", "head", runGit), [])
  assert.equal(gitWasRead, false)
})

test("Husky accepts exactly the six documented types for every developer", context => {
  const folder = mkdtempSync(path.join(tmpdir(), "23-commit-message-"))
  context.after(() => rmSync(folder, { recursive: true, force: true }))
  const messageFile = path.join(folder, "message.txt")
  for (const prefix of ["", "-"]) {
    for (const type of ["fix", "upd", "style", "docs", "feat", "chore", "test", "build", "perf", "feature"]) {
      writeFileSync(messageFile, `${prefix}${type}: valid message\n\n- explain the change\n`)
      const checked = spawnSync("sh", [".husky/commit-msg", messageFile], {
        cwd: repoRoot, encoding: "utf8", env: { ...process.env, CLAUDECODE: "" },
      })
      const allowed = ["fix", "upd", "style", "docs", "feat", "chore"].includes(type)
      assert.equal(checked.status, allowed ? 0 : 1, `${prefix}${type}: ${checked.stderr}`)
      if (!allowed) assert.match(checked.stderr, /type must be fix, upd, style, docs, feat, chore/)
    }
  }
})

test("Husky accepts the user's removal subjects with descriptions", context => {
  const folder = mkdtempSync(path.join(tmpdir(), "23-removal-message-"))
  context.after(() => rmSync(folder, { recursive: true, force: true }))
  const messageFile = path.join(folder, "message.txt")
  for (const subject of ["-docs: UI buying flow", "-upd: buying flow"]) {
    writeFileSync(messageFile, `${subject}\n\n- remove the obsolete buying flow documentation\n`)
    const checked = spawnSync("sh", [".husky/commit-msg", messageFile], {
      cwd: repoRoot, encoding: "utf8", env: { ...process.env, CLAUDECODE: "1" },
    })
    assert.equal(checked.status, 0, `${subject}: ${checked.stderr}`)
  }
})

test("the commit-message command requires a filename", () => {
  const checked = spawnSync(process.execPath, [".github/scripts/validate-commit-naming.mjs", "--message-file"], { cwd: repoRoot, encoding: "utf8" })
  assert.equal(checked.status, 1)
  assert.match(checked.stderr, /Supply the commit message file/)
})

test("Husky accepts automatic Merge branch messages without a description", context => {
  const folder = mkdtempSync(path.join(tmpdir(), "23-merge-message-"))
  context.after(() => rmSync(folder, { recursive: true, force: true }))
  const messageFile = path.join(folder, "message.txt")
  writeFileSync(messageFile, "Merge branch 'feat/storybook' into development\n")
  const checked = spawnSync("sh", [".husky/commit-msg", messageFile], {
    cwd: repoRoot, encoding: "utf8", env: { ...process.env, CLAUDECODE: "1" },
  })
  assert.equal(checked.status, 0, checked.stderr)
})
