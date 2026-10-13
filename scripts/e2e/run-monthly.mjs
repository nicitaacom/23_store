import { randomUUID } from "node:crypto"
import { execFileSync } from "node:child_process"
import { spawn } from "node:child_process"
import { appendFile, mkdir, readFile, writeFile } from "node:fs/promises"
import path from "node:path"
import { fileURLToPath, pathToFileURL } from "node:url"

import { createE2EReport } from "./build-report.mjs"
import { writePaidOperationSnapshot } from "./paid-budget.mjs"
import { buildPreflight } from "./preflight.mjs"

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..")
const artifactDirectory = path.resolve(repositoryRoot, process.env.E2E_ARTIFACT_DIR ?? "artifacts/e2e")

function parseRunArguments(argumentsList) {
  const options = { suite: "monthly", browser: process.env.E2E_BROWSER ?? "chrome", spec: null, seed: null }
  for (let argumentIndex = 0; argumentIndex < argumentsList.length; argumentIndex += 1) {
    const argumentName = argumentsList[argumentIndex]
    if (argumentName === "--suite") options.suite = argumentsList[++argumentIndex]
    else if (argumentName === "--browser") options.browser = argumentsList[++argumentIndex]
    else if (argumentName === "--spec") options.spec = argumentsList[++argumentIndex]
    else if (argumentName === "--seed") options.seed = argumentsList[++argumentIndex]
  }
  if (!new Set(["monthly", "replay"]).has(options.suite)) throw new Error(`Unsupported E2E suite: ${options.suite}`)
  return options
}

function spawnCommand(commandName, commandArguments, environment) {
  return new Promise((resolve, reject) => {
    const childProcess = spawn(commandName, commandArguments, { cwd: repositoryRoot, env: environment, stdio: "inherit" })
    childProcess.once("error", reject)
    childProcess.once("exit", (exitCode, signalName) => resolve({ exitCode: exitCode ?? 1, signalName }))
  })
}

async function waitForSite(baseUrl) {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    try {
      const response = await fetch(baseUrl, { method: "HEAD", signal: AbortSignal.timeout(1500) })
      if (response.ok) return
    } catch {
      // The production server may need a few seconds to start.
    }
    await new Promise(resolve => setTimeout(resolve, 1000))
  }
  throw new Error(`The local production server did not answer at ${new URL(baseUrl).host}`)
}

function validateSpec(specPath) {
  if (!specPath) return null
  const normalizedPath = path.normalize(specPath)
  if (!normalizedPath.startsWith(`cypress${path.sep}monthly${path.sep}`) || normalizedPath.includes("..")) {
    throw new Error("Replay specs must be inside cypress/monthly")
  }
  return normalizedPath
}

async function finishRun(runEnvironment, cypressExitCode, originalFailure) {
  const cleanupOutcome = await spawnCommand(process.execPath, ["scripts/e2e/cleanup.mjs"], runEnvironment)
    .catch(error => ({ exitCode: 1, error: error.message }))
  await writePaidOperationSnapshot(runEnvironment)
  let summary = await createE2EReport()
  if (cleanupOutcome.exitCode !== 0) {
    summary.cleanupStatus = "failed"
    summary.blockers = [...(summary.blockers ?? []), "Run-owned resource cleanup did not complete"]
    summary.status = "FAIL"
    await writeFile(path.join(artifactDirectory, "summary.json"), `${JSON.stringify(summary, null, 2)}\n`)
    summary = await createE2EReport()
  }
  summary = await sendReportIfConfigured(runEnvironment, summary)
  if (originalFailure) console.error(originalFailure)
  if (cypressExitCode !== 0 || cleanupOutcome.exitCode !== 0 || summary.status !== "PASS") process.exitCode = 1
}

async function sendReportIfConfigured(runEnvironment, summary) {
  if (runEnvironment.E2E_SEND_REPORT !== "true") return summary
  if (!runEnvironment.NEXT_RESEND_SECRET) {
    summary.reportDeliveryStatus = "blocked_by_configuration"
    summary.blockers = [...(summary.blockers ?? []), "Monthly report email was not attempted because NEXT_RESEND_SECRET is missing"]
    await writeFile(path.join(artifactDirectory, "summary.json"), `${JSON.stringify(summary, null, 2)}\n`)
    await writeFile(path.join(artifactDirectory, "report-delivery.json"), `${JSON.stringify({
      status: "blocked_by_configuration",
      reason: "NEXT_RESEND_SECRET is missing",
    }, null, 2)}\n`)
    return createE2EReport()
  }

  const emailOutcome = await spawnCommand(process.execPath, ["scripts/e2e/send-report.mjs"], runEnvironment)
    .catch(error => ({ exitCode: 1, error: error.message }))
  if (emailOutcome.exitCode !== 0) {
    const latestSummary = JSON.parse(await readFile(path.join(artifactDirectory, "summary.json"), "utf8"))
    latestSummary.reportDeliveryStatus = "failed"
    latestSummary.blockers = [...(latestSummary.blockers ?? []), "The monthly report could not be sent or verified"]
    await writeFile(path.join(artifactDirectory, "summary.json"), `${JSON.stringify(latestSummary, null, 2)}\n`)
    process.exitCode = 1
  }
  return createE2EReport()
}

async function runMonthly() {
  const options = parseRunArguments(process.argv.slice(2))
  const specPath = validateSpec(options.spec)
  const runId = process.env.E2E_RUN_ID
    ?? (process.env.GITHUB_RUN_ID ? `gha-${process.env.GITHUB_RUN_ID}` : `${new Date().toISOString().replace(/[-:.TZ]/g, "")}-${randomUUID().slice(0, 8)}`)
  const runEnvironment = {
    ...process.env,
    E2E_RUN_ID: runId,
    E2E_RUNNER_SHA: execFileSync("git", ["rev-parse", "HEAD"], { cwd: repositoryRoot, encoding: "utf8" }).trim(),
    E2E_SUITE: options.suite,
    E2E_BROWSER: options.browser,
  }
  if (options.seed !== null) runEnvironment.E2E_SEED = options.seed
  if (options.suite === "monthly") {
    // Let preflight write the normal INCOMPLETE report when the target is not configured.
    // The browser runner is reachable only after preflight passes, which already requires this value.
    runEnvironment.E2E_BASE_URL = runEnvironment.NEXT_PUBLIC_PRODUCTION_URL ?? ""
  }
  if (options.suite === "replay" && !runEnvironment.E2E_BASE_URL) {
    runEnvironment.E2E_BASE_URL = runEnvironment.NEXT_PUBLIC_PRODUCTION_URL
  }

  await mkdir(artifactDirectory, { recursive: true })
  const inventoryOutcome = await spawnCommand(process.execPath, ["scripts/e2e/inventory-requests.mjs"], runEnvironment)
  if (inventoryOutcome.exitCode !== 0) {
    throw new Error(`Request inventory generation exited with code ${inventoryOutcome.exitCode}`)
  }
  const preflight = await buildPreflight(runEnvironment)
  const preflightEvidence = preflight.checks
    .filter(check => check.operationId)
    .map(check => ({
      kind: "coverage-event",
      operationId: check.operationId,
      scenarioId: "monthly-preflight-stripe-mode",
      status: check.status,
      route: check.route,
      runId,
      providerId: check.productId,
      verificationReference: check.verificationReference,
      target: preflight.targetUrl,
      testedCommit: preflight.productionSha,
      at: new Date().toISOString(),
      message: check.detail,
    }))
  if (preflightEvidence.length) {
    await appendFile(path.join(artifactDirectory, "coverage-events.jsonl"),
      `${preflightEvidence.map(evidence => JSON.stringify(evidence)).join("\n")}\n`)
  }
  await writeFile(path.join(artifactDirectory, "summary.json"), `${JSON.stringify(preflight, null, 2)}\n`)
  if (preflight.status !== "PASS") {
    await writeFile(path.join(artifactDirectory, "job-results.json"), `${JSON.stringify({ runId, jobs: [
      { name: "inventory-and-preflight", status: "incomplete", detail: "Browser journeys were stopped before any writes because required checks did not pass" },
    ] }, null, 2)}\n`)
    let summary = await createE2EReport()
    summary = await sendReportIfConfigured(runEnvironment, summary)
    console.log(JSON.stringify({ status: summary.status, blockers: preflight.blockers }, null, 2))
    process.exitCode = 2
    return
  }

  let cypressExitCode = 1
  let browserSessionExitCode = 1
  let originalFailure = null
  try {
    const cypressEnvironment = { ...runEnvironment }
    delete cypressEnvironment.CYPRESS_INSTALL_BINARY
    const installOutcome = await spawnCommand("pnpm", ["exec", "cypress", "install"], cypressEnvironment)
    if (installOutcome.exitCode !== 0) throw new Error(`Cypress installation exited with code ${installOutcome.exitCode}`)
    const verifyOutcome = await spawnCommand("pnpm", ["exec", "cypress", "verify"], cypressEnvironment)
    if (verifyOutcome.exitCode !== 0) throw new Error(`Cypress verification exited with code ${verifyOutcome.exitCode}`)
    const playwrightInstallOutcome = await spawnCommand("pnpm", ["exec", "playwright", "install", "chromium"], cypressEnvironment)
    if (playwrightInstallOutcome.exitCode !== 0) throw new Error(`Playwright Chromium installation exited with code ${playwrightInstallOutcome.exitCode}`)

    const baseUrl = new URL(runEnvironment.E2E_BASE_URL)
    if (["localhost", "127.0.0.1", "::1", "[::1]"].includes(baseUrl.hostname)) {
      await waitForSite(runEnvironment.E2E_BASE_URL)
    }
    const cypressArguments = ["exec", "cypress", "run", "--browser", options.browser, "--config", "retries=0"]
    if (specPath) cypressArguments.push("--spec", specPath)
    const cypressOutcome = await spawnCommand("pnpm", cypressArguments, cypressEnvironment)
    cypressExitCode = cypressOutcome.exitCode
    if (cypressOutcome.signalName) originalFailure = `Cypress stopped with signal ${cypressOutcome.signalName}`
    const browserSessionEnvironment = { ...cypressEnvironment }
    const browserSessionOutcome = await spawnCommand(process.execPath, [
      "scripts/e2e/browser-sessions.mjs",
      "cypress/scenarios/support-two-sessions.json",
    ], browserSessionEnvironment)
    browserSessionExitCode = browserSessionOutcome.exitCode
    if (browserSessionOutcome.signalName) originalFailure = `Two-session support journey stopped with signal ${browserSessionOutcome.signalName}`
    await writeFile(path.join(artifactDirectory, "job-results.json"), `${JSON.stringify({ runId, jobs: [
      { name: "inventory-and-preflight", status: "passed" },
      { name: "production-browser-journeys", status: cypressExitCode === 0 ? "passed" : "failed", exitCode: cypressExitCode },
      { name: "two-session-support-realtime", status: browserSessionExitCode === 0 ? "passed" : "failed", exitCode: browserSessionExitCode },
    ] }, null, 2)}\n`)
  } catch (error) {
    originalFailure = error.message
    await writeFile(path.join(artifactDirectory, "job-results.json"), `${JSON.stringify({ runId, jobs: [
      { name: "monthly-runner", status: "failed", message: error.message.slice(0, 500) },
    ] }, null, 2)}\n`)
  } finally {
    const fullSuiteExitCode = cypressExitCode === 0 && browserSessionExitCode === 0 ? 0 : 1
    await finishRun(runEnvironment, fullSuiteExitCode, originalFailure)
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await runMonthly()
