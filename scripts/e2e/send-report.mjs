import { createHash } from "node:crypto"
import { readFile, writeFile } from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"


const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..")
const artifactDirectory = path.resolve(repositoryRoot, process.env.E2E_ARTIFACT_DIR ?? "artifacts/e2e")

function escapeHtml(value) {
  return value.replace(/[&<>"']/g, character => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[character])
}

const report = await readFile(path.join(artifactDirectory, "report.md"), "utf8")
const handoff = await readFile(path.join(artifactDirectory, "ai-handoff.md"), "utf8")
const summary = JSON.parse(await readFile(path.join(artifactDirectory, "summary.json"), "utf8"))
const apiKey = process.env.NEXT_RESEND_SECRET
if (!apiKey) throw new Error("NEXT_RESEND_SECRET is required to send the monthly report")
const sender = process.env.E2E_REPORT_FROM ?? "e2e-test-23-store@nicitaa.com"
const recipient = process.env.E2E_REPORT_TO ?? "support@nicitaa.com"
if (sender !== "e2e-test-23-store@nicitaa.com" || recipient !== "support@nicitaa.com") {
  throw new Error("Monthly report addresses are fixed to e2e-test-23-store@nicitaa.com → support@nicitaa.com")
}

const runId = process.env.E2E_RUN_ID ?? process.env.GITHUB_RUN_ID ?? summary.runnerSha ?? "local"
const idempotencyKey = createHash("sha256").update(`23-store-e2e:${runId}:${summary.runnerSha ?? "unknown"}`).digest("hex")
const actionLink = process.env.GITHUB_SERVER_URL && process.env.GITHUB_REPOSITORY && process.env.GITHUB_RUN_ID
  ? `${process.env.GITHUB_SERVER_URL}/${process.env.GITHUB_REPOSITORY}/actions/runs/${process.env.GITHUB_RUN_ID}`
  : "No GitHub Actions run link is available for this local run."
const subjectStatus = summary.status === "PASS" ? "PASS" : summary.status === "FAIL" ? "FAIL" : "INCOMPLETE"
const messageText = `${report}\n\nAI repair handoff\n\n${handoff}\n\nActions: ${actionLink}`
const messageHtml = `<h1>[23_store E2E] ${subjectStatus}</h1><p>Production: ${escapeHtml(summary.targetUrl ?? "unknown")}<br>Deployed SHA: ${escapeHtml(summary.productionSha ?? "unknown")}<br>Runner SHA: ${escapeHtml(summary.runnerSha ?? "unknown")}</p><p><a href="${escapeHtml(actionLink)}">GitHub Actions evidence</a></p><h2>Report</h2><pre style="white-space:pre-wrap">${escapeHtml(report)}</pre><h2>AI repair handoff</h2><pre style="white-space:pre-wrap">${escapeHtml(handoff)}</pre>`

const response = await fetch("https://api.resend.com/emails", {
  method: "POST",
  headers: { authorization: `Bearer ${apiKey}`, "content-type": "application/json", "Idempotency-Key": idempotencyKey },
  body: JSON.stringify({
    from: sender,
    to: [recipient],
    subject: `[23_store E2E] ${subjectStatus}`,
    text: messageText,
    html: messageHtml,
  }),
  signal: AbortSignal.timeout(20000),
})
const responseBody = await response.json().catch(() => ({}))
if (!response.ok) {
  console.error(JSON.stringify({ status: response.status, error: responseBody.message ?? "Resend rejected the report" }))
  summary.reportDeliveryStatus = "failed"
  await writeFile(path.join(artifactDirectory, "summary.json"), `${JSON.stringify(summary, null, 2)}\n`)
  await writeFile(path.join(artifactDirectory, "report-delivery.json"), `${JSON.stringify({ status: "failed", httpStatus: response.status }, null, 2)}\n`)
  process.exitCode = 1
} else {
  const messageId = responseBody.id
  let lastEvent = null
  let eventCheckError = null
  if (messageId) {
    const timeoutMs = Math.max(0, Number(process.env.E2E_REPORT_DELIVERY_TIMEOUT_SECONDS ?? 30)) * 1000
    const stopAt = Date.now() + timeoutMs
    do {
      try {
        const statusResponse = await fetch(`https://api.resend.com/emails/${encodeURIComponent(messageId)}`, {
          headers: { authorization: `Bearer ${apiKey}` },
          signal: AbortSignal.timeout(10000),
        })
        if (!statusResponse.ok) throw new Error(`Email status returned HTTP ${statusResponse.status}`)
        const statusBody = await statusResponse.json()
        lastEvent = statusBody.last_event ?? null
        eventCheckError = null
      } catch (error) {
        eventCheckError = error.message
      }
      if (["delivered", "bounced", "complained"].includes(lastEvent) || Date.now() >= stopAt) break
      await new Promise(resolve => setTimeout(resolve, Math.min(2000, Math.max(0, stopAt - Date.now()))))
    } while (Date.now() <= stopAt)
  } else {
    eventCheckError = "Resend response did not include an email id"
  }

  const deliveryFailed = ["bounced", "complained"].includes(lastEvent)
  summary.reportDeliveryStatus = deliveryFailed ? "failed" : lastEvent === "delivered" ? "delivered" : "accepted_by_resend"
  if (deliveryFailed) summary.status = "FAIL"
  const deliveryRecord = {
    status: summary.reportDeliveryStatus,
    messageId,
    lastEvent,
    deliveryVerified: lastEvent === "delivered",
    eventCheckError,
  }
  await writeFile(path.join(artifactDirectory, "summary.json"), `${JSON.stringify(summary, null, 2)}\n`)
  await writeFile(path.join(artifactDirectory, "report-delivery.json"), `${JSON.stringify(deliveryRecord, null, 2)}\n`)
  console.log(JSON.stringify(deliveryRecord))
  if (deliveryFailed) process.exitCode = 1
}
