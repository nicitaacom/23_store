import { execFileSync } from "node:child_process"
import process from "node:process"

const ALLOWED_TYPES = ["fix", "upd", "style", "docs", "feat", "chore"]
const SUBJECT_PATTERN = /^(fix|upd|style|docs|feat|chore): [a-z0-9].*$/

export function validateCommitText(commitText, label = "commit") {
  const lines = commitText.trimEnd().split(/\r?\n/)
  const subject = lines[0] ?? ""
  const errors = []

  if (lines.length !== 1) errors.push(`${label} must not have a body`)
  if (!SUBJECT_PATTERN.test(subject)) errors.push(`${label} must use "type: lowercase message"`)
  if (/^[a-z]+\(/.test(subject)) errors.push(`${label} must not use a scope`)
  if (subject.endsWith(".")) errors.push(`${label} must not end with a period`)

  const separatorIndex = subject.indexOf(": ")
  const type = separatorIndex === -1 ? subject : subject.slice(0, separatorIndex)
  const message = separatorIndex === -1 ? "" : subject.slice(separatorIndex + 2)

  if (!ALLOWED_TYPES.includes(type)) errors.push(`${label} type must be ${ALLOWED_TYPES.join(", ")}`)
  if (message && message !== message.toLowerCase()) errors.push(`${label} message must be lowercase`)

  return [...new Set(errors)]
}

export function selectIntroducedCommits(baseSha, headSha, runGit = execFileSync) {
  if (!baseSha || !headSha || /^0+$/.test(baseSha)) return []

  const gitOutput = runGit(
    "git",
    ["log", "--no-merges", "-z", "--format=%H%x1f%B", `${baseSha}..${headSha}`],
    { encoding: "utf8" },
  )

  return gitOutput
    .split("\0")
    .filter(Boolean)
    .map(commitEntry => {
      const separatorIndex = commitEntry.indexOf("\u001f")
      return {
        sha: commitEntry.slice(0, separatorIndex),
        text: commitEntry.slice(separatorIndex + 1),
      }
    })
}

export function validatePullRequest({ baseSha, headSha, pullRequestTitle, runGit = execFileSync }) {
  const errors = []

  if (pullRequestTitle) errors.push(...validateCommitText(pullRequestTitle, "pull request title"))

  for (const commit of selectIntroducedCommits(baseSha, headSha, runGit)) {
    errors.push(...validateCommitText(commit.text, `commit ${commit.sha.slice(0, 12)}`))
  }

  return errors
}

function main() {
  const errors = validatePullRequest({
    baseSha: process.env.COMMIT_NAMING_BASE_SHA,
    headSha: process.env.COMMIT_NAMING_HEAD_SHA,
    pullRequestTitle: process.env.COMMIT_NAMING_PR_TITLE,
  })

  if (!errors.length) {
    console.log("Commit names are valid")
    return
  }

  console.error(errors.map(error => `- ${error}`).join("\n"))
  process.exitCode = 1
}

if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) main()
