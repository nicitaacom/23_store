import assert from "node:assert/strict"
import test from "node:test"

import { selectIntroducedCommits, validateCommitText, validatePullRequest } from "./validate-commit-naming.mjs"

test("accepts every allowed commit type", () => {
  for (const type of ["fix", "upd", "style", "docs", "feat", "chore"]) {
    assert.deepEqual(validateCommitText(`${type}: valid message`), [])
  }
})

test("rejects invalid subject shapes", () => {
  assert.match(validateCommitText("feat(scope): message").join("\n"), /scope/)
  assert.match(validateCommitText("feature: message").join("\n"), /type/)
  assert.match(validateCommitText("feat: Uppercase message").join("\n"), /lowercase/)
  assert.match(validateCommitText("feat: message.").join("\n"), /period/)
})

test("rejects a multiline commit body", () => {
  assert.match(validateCommitText("feat: message\n\nextra details").join("\n"), /body/)
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
