import { readdir, readFile, mkdir, writeFile } from "node:fs/promises"
import path from "node:path"
import { fileURLToPath, pathToFileURL } from "node:url"

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..")
const artifactDirectory = path.resolve(repositoryRoot, process.env.E2E_ARTIFACT_DIR ?? "artifacts/e2e")
const mappingPath = path.join(repositoryRoot, "cypress/coverage/request-map.json")
const secretKeyPattern = /authorization|cookie|password|secret|token|wallet|signed.?url|reset.?link/i
const safeStatuses = new Set(["passed", "failed", "not_exercised", "blocked_by_configuration"])

export function redactEvidence(value, parentKey = "") {
  if (secretKeyPattern.test(parentKey)) return "[REDACTED]"
  if (Array.isArray(value)) return value.map(item => redactEvidence(item))
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, child]) => [key, redactEvidence(child, key)]))
  }
  if (typeof value !== "string") return value
  return value
    .replace(/Bearer\s+[^\s,;]+/gi, "Bearer [REDACTED]")
    .replace(/([?&](?:X-Amz-Signature|X-Amz-Credential|signature|token|access_token)=)[^&\s]+/gi, "$1[REDACTED]")
    .replace(/https?:\/\/[^\s"']+\?.*(?:X-Amz-Signature|signature|token)=[^\s"']+/gi, "[SIGNED_URL_REDACTED]")
}

async function readJson(filePath, fallbackValue) {
  try {
    return JSON.parse(await readFile(filePath, "utf8"))
  } catch {
    return fallbackValue
  }
}

function parseEvidenceLines(content) {
  return content.split("\n").filter(Boolean).map(line => {
    try {
      return JSON.parse(line)
    } catch {
      return { kind: "invalid-evidence-line", status: "failed", message: "An evidence record could not be parsed" }
    }
  })
}

async function readEvidenceRecords() {
  const evidenceDirectory = path.join(artifactDirectory, "evidence")
  const records = []
  async function readEvidenceTree(directory) {
    let entries = []
    try {
      entries = await readdir(directory, { withFileTypes: true })
    } catch {
      return
    }
    for (const entry of entries) {
      const entryPath = path.join(directory, entry.name)
      if (entry.isDirectory()) await readEvidenceTree(entryPath)
      else if (entry.isFile() && entry.name.endsWith(".json")) {
        const record = await readJson(entryPath, null)
        if (record) records.push(record)
      } else if (entry.isFile() && entry.name === "coverage-events.jsonl") {
        records.push(...parseEvidenceLines(await readFile(entryPath, "utf8")))
      }
    }
  }
  await readEvidenceTree(evidenceDirectory)
  await readEvidenceTree(path.join(artifactDirectory, "jobs"))
  try {
    records.push(...parseEvidenceLines(await readFile(path.join(artifactDirectory, "coverage-events.jsonl"), "utf8")))
  } catch {
    // A run without browser evidence remains incomplete.
  }

  const jobResults = await readJson(path.join(artifactDirectory, "job-results.json"), null)
  for (const job of jobResults?.jobs ?? []) {
    if (job.status === "failed") records.push({ kind: "job-result", status: "failed", runId: jobResults.runId ?? null, message: `${job.name} failed` })
  }
  const expandedRecords = records.flatMap(record => {
    if (!Array.isArray(record.timeline)) return [record]
    const routeRecords = record.timeline.filter(timelineRecord => timelineRecord.operationId && safeStatuses.has(timelineRecord.status))
      .map(timelineRecord => ({
        ...timelineRecord,
        kind: "observed-route-request",
        runId: timelineRecord.runId ?? record.runId,
        scenarioId: timelineRecord.sourceScenarioId ?? record.scenarioId ?? null,
      }))
    return [record, ...routeRecords]
  })
  return expandedRecords.map(record => redactEvidence(record))
}

export function filterEvidenceForRun(evidenceRecords, runId) {
  if (!runId) return []
  return evidenceRecords.filter(record => record.runId === runId)
}

export function buildCoverage(inventory, evidenceRecords) {
  const evidenceByOperation = new Map()
  for (const evidence of evidenceRecords) {
    if (!evidence.operationId || !safeStatuses.has(evidence.status)) continue
    const operationEvidence = evidenceByOperation.get(evidence.operationId) ?? []
    operationEvidence.push(evidence)
    evidenceByOperation.set(evidence.operationId, operationEvidence)
  }

  return (inventory?.operations ?? []).map(operation => {
    const matchingEvidence = evidenceByOperation.get(operation.operationId) ?? []
    const passingEvidence = matchingEvidence.find(evidence => evidence.status === "passed"
      && (evidence.requestId || evidence.providerId || evidence.resourceId)
      && evidence.verificationReference)
    const failingEvidence = matchingEvidence.find(evidence => evidence.status === "failed")
    const runtimeStatus = failingEvidence ? "failed" : passingEvidence ? "passed"
      : matchingEvidence.find(evidence => evidence.status === "blocked_by_configuration")?.status ?? "not_exercised"
    return {
      operationId: operation.operationId,
      operationKind: operation.operationKind,
      route: operation.route,
      method: operation.method,
      sourcePath: operation.sourcePath,
      line: operation.line,
      scenarioId: operation.scenarioId,
      mappingStatus: operation.mappingStatus,
      required: operation.required,
      status: runtimeStatus,
      evidence: passingEvidence ?? failingEvidence ?? matchingEvidence[0] ?? null,
    }
  })
}

export function buildAsyncCoverage(inventory, evidenceRecords) {
  const evidenceByOperation = new Map()
  for (const evidence of evidenceRecords) {
    if (!evidence.operationId || !safeStatuses.has(evidence.status)) continue
    const operationEvidence = evidenceByOperation.get(evidence.operationId) ?? []
    operationEvidence.push(evidence)
    evidenceByOperation.set(evidence.operationId, operationEvidence)
  }
  return (inventory?.asyncExpressions ?? []).map(operation => {
    const matchingEvidence = evidenceByOperation.get(operation.operationId) ?? []
    const passingEvidence = matchingEvidence.find(evidence => evidence.status === "passed"
      && (evidence.requestId || evidence.providerId || evidence.resourceId)
      && evidence.verificationReference)
    const failingEvidence = matchingEvidence.find(evidence => evidence.status === "failed")
    const runtimeStatus = failingEvidence ? "failed" : passingEvidence ? "passed"
      : matchingEvidence.find(evidence => evidence.status === "blocked_by_configuration")?.status ?? "not_exercised"
    return {
      operationId: operation.operationId,
      sourcePath: operation.sourcePath,
      line: operation.line,
      functionName: operation.functionName,
      executionForm: operation.executionForm,
      classification: operation.classification,
      classificationReason: operation.classificationReason ?? null,
      requestOperationIds: operation.requestOperationIds ?? [],
      dependencyOperationIds: operation.dependencyOperationIds ?? [],
      scenarioId: operation.scenarioId,
      mappingStatus: operation.mappingStatus,
      required: operation.required,
      status: runtimeStatus,
      evidence: passingEvidence ?? failingEvidence ?? matchingEvidence[0] ?? null,
    }
  })
}

function countCoverage(coverage) {
  return coverage.reduce((counts, operation) => {
    counts[operation.status] = (counts[operation.status] ?? 0) + 1
    if (operation.mappingStatus === "mapped") counts.mapped += 1
    if (operation.required) counts.required += 1
    return counts
  }, { mapped: 0, required: 0, passed: 0, failed: 0, not_exercised: 0, blocked_by_configuration: 0 })
}

export function getFinalStatus(summary, coverage, counts, evidenceRecords, asyncCoverage = []) {
  if (counts.failed || evidenceRecords.some(evidence => evidence.status === "failed")
    || summary?.cleanupStatus === "failed" || summary?.reportDeliveryStatus === "failed") return "FAIL"
  if (!coverage.length) return "INCOMPLETE"
  const untestedRequired = coverage.some(operation => operation.required && operation.status !== "passed")
  const unaccountedAsync = asyncCoverage.some(operation => operation.mappingStatus !== "mapped"
    || operation.classification === "needs-review"
    || (operation.required && operation.status !== "passed"))
  if (summary?.blockers?.length || untestedRequired || counts.mapped !== coverage.length
    || unaccountedAsync
    || (summary?.cleanupStatus && summary.cleanupStatus !== "complete")) return "INCOMPLETE"
  return "PASS"
}

function renderCoverageRows(coverage, statusFilter, limit = 30) {
  const rows = coverage.filter(operation => operation.status === statusFilter).slice(0, limit)
  if (!rows.length) return ["| — | — | — | — |", "| --- | --- | --- | --- |"]
  return [
    "| Operation | Route or request | Source | Status |",
    "| --- | --- | --- | --- |",
    ...rows.map(operation => `| ${operation.operationId} | ${operation.method ? `${operation.method} ${operation.route}` : operation.operationKind} | ${operation.sourcePath}:${operation.line} | ${operation.mappingStatus === "unmapped" ? "unmapped" : operation.status} |`),
    ...(coverage.filter(operation => operation.status === statusFilter).length > rows.length
      ? [`| … | ${coverage.filter(operation => operation.status === statusFilter).length - rows.length} more rows are in request-coverage.json | — | — |`]
      : []),
  ]
}

function renderUnmappedRows(coverage, limit = 30) {
  const unmapped = coverage.filter(operation => operation.mappingStatus === "unmapped")
  return [
    "| Operation | Route or request | Source | Status |",
    "| --- | --- | --- | --- |",
    ...(unmapped.length ? unmapped.slice(0, limit).map(operation => `| ${operation.operationId} | ${operation.method ? `${operation.method} ${operation.route}` : operation.operationKind} | ${operation.sourcePath}:${operation.line} | unmapped |`)
      : ["| — | — | — | — |"]),
    ...(unmapped.length > limit ? [`| … | ${unmapped.length - limit} more rows are in request-coverage.json | — | — |`] : []),
  ]
}

function buildMarkdown(summary, coverage, counts, asyncCoverage, evidenceRecords) {
  const failureRecords = evidenceRecords.filter(evidence => evidence.status === "failed")
  const artifactUrl = process.env.GITHUB_SERVER_URL && process.env.GITHUB_REPOSITORY && process.env.GITHUB_RUN_ID
    ? `${process.env.GITHUB_SERVER_URL}/${process.env.GITHUB_REPOSITORY}/actions/runs/${process.env.GITHUB_RUN_ID}`
    : "Unavailable for this local run"
  const failedRows = renderCoverageRows(coverage, "failed")
  const incompleteRows = renderCoverageRows(coverage, "not_exercised")
  const unmappedRows = renderUnmappedRows(coverage)
  const asyncNeedingReview = asyncCoverage.filter(operation => operation.mappingStatus !== "mapped" || operation.classification === "needs-review")
  const unverifiedRequestAwaits = asyncCoverage.filter(operation => operation.required && operation.status !== "passed")
  return [
    `# [23_store E2E] ${summary.status}`,
    "",
    `Target: ${summary.targetUrl ?? "unknown"}`,
    `Production commit: ${summary.productionSha ?? "unknown"}`,
    `Runner commit: ${summary.runnerSha ?? "unknown"}`,
    `Provider modes: ${JSON.stringify(summary.providerModes ?? {})}`,
    `Actions evidence: ${artifactUrl}`,
    "",
    "## Coverage",
    "",
    `Discovered ${coverage.length}; mapped ${counts.mapped}; required ${counts.required}; passed ${counts.passed}; failed ${counts.failed}; not exercised ${counts.not_exercised}; blocked by configuration ${counts.blocked_by_configuration}.`,
    `Required weekly journeys: ${summary.requiredWeeklySpecs ?? 0}; missing journey files: ${(summary.missingRequiredSpecs ?? []).join(", ") || "none"}.`,
    "",
    "### Failed operations",
    "",
    ...failedRows,
    "",
    "### Unmapped operations",
    "",
    ...unmappedRows,
    "",
    "### Unexercised operations",
    "",
    ...incompleteRows,
    "",
    "## Awaited and background work",
    "",
    `Inventory: ${summary.asyncCounts?.awaitExpressions ?? 0} awaits; ${summary.asyncCounts?.returnedCalls ?? 0} returned calls; ${summary.asyncCounts?.promiseChains ?? 0} promise chains; ${summary.asyncCounts?.promiseAllGroups ?? 0} Promise.all groups; ${summary.asyncCounts?.voidCalls ?? 0} fire-and-forget calls; ${summary.asyncCounts?.subscriptionCalls ?? 0} subscriptions. Listed ${asyncCoverage.length} async expressions.`,
    `Needs source review or mapping: ${asyncNeedingReview.length}. Provider/realtime operations still needing a link to their caller: ${summary.asyncCounts?.dependencyReview ?? 0}. Required request/provider awaits without independent passing evidence: ${unverifiedRequestAwaits.length}. Full rows are in request-coverage.json.`,
    ...(asyncNeedingReview.length ? asyncNeedingReview.slice(0, 30).map(operation => `- ${operation.operationId} — ${operation.sourcePath}:${operation.line} (${operation.classification}, ${operation.mappingStatus})`) : ["- All awaited expressions have a reviewed classification and mapping."]),
    ...(unverifiedRequestAwaits.length ? unverifiedRequestAwaits.slice(0, 30).map(operation => `- No runtime evidence: ${operation.operationId} — ${operation.sourcePath}:${operation.line} (${operation.scenarioId ?? "unassigned"})`) : []),
    "",
    "## Preflight blockers",
    "",
    ...(summary.blockers?.length ? summary.blockers.map(blocker => `- ${blocker}`) : ["- None"]),
    "",
    "## Timing and cost",
    "",
    `Recorded timing failures: ${evidenceRecords.filter(evidence => evidence.timingStatus === "failed").length}`,
    `Real provider action journal: ${summary.providerOperationJournalStatus ?? "unavailable"}; ${summary.providerOperationCount ?? "unknown"} distinct actions recorded. No dollar cap is required; retries are bounded by the application.`,
    `Cleanup: ${summary.cleanupStatus ?? "not started"}`,
    "",
    "## Observed failures",
    "",
    ...(failureRecords.length ? failureRecords.map(failure => `- ${failure.message ?? failure.operationId ?? "Unspecified failure"}`) : ["- No runtime failures were recorded; missing coverage remains incomplete." ]),
    "",
    "Evidence files: `artifacts/e2e`",
    "",
  ].join("\n")
}

function buildHandoff(summary, evidenceRecords) {
  const firstFailure = evidenceRecords.find(evidence => evidence.status === "failed")
  const firstOperation = firstFailure?.operationId ?? "not exercised"
  const actual = firstFailure?.message ?? "No real-service failure was observed; required real-service coverage was blocked or unexercised."
  const evidenceText = firstFailure ? JSON.stringify(firstFailure, null, 2) : "No runtime evidence was collected."
  return [
    "Fix the defect below in nicitaacom/23_store on development.",
    "Read AGENTS.md, plan 25, dev_readme-eslint.md and commit-patterns.md.",
    "",
    `Primary target: ${summary.targetUrl ?? "unknown"}`,
    `Deployed/source commit: ${summary.productionSha ?? "unknown"} / ${summary.runnerSha ?? "unknown"}`,
    `Provider environment: ${JSON.stringify(summary.providerModes ?? {})}`,
    `Spec/test/operation IDs: ${firstOperation}`,
    "Browser/viewport/locale/seed: not exercised",
    "",
    "Reproduction using fresh disposable records:",
    "1. Preflight is incomplete; confirm the recorded service settings and deployment before creating records.",
    "2. Run the required scenario with actual browser requests and verify its downstream state.",
    "",
    "Expected: actual UI result and persisted/provider result match the submitted business action.",
    `Actual: ${actual}`,
    `Evidence: ${evidenceText}`,
    "Replay: pnpm e2e:replay --spec <spec> --seed 250",
    `Cleanup: ${summary.cleanupStatus ?? "not started"}; unresolved resources are listed in the resource journal.`,
    "",
    "Gather missing access/configuration upfront. Reproduce with real services, fix the application, and rerun this regression and relevant surrounding cases.",
    "Preserve real-service assertions; do not replace responses, force clicks, suppress failures, or relax measured timing.",
    "",
  ].join("\n")
}

export async function createE2EReport() {
  const summary = await readJson(path.join(artifactDirectory, "summary.json"), {
    status: "INCOMPLETE",
    blockers: ["Preflight summary is missing"],
    cleanupStatus: "not_started",
    providerModes: {},
  })
  const mappingDocument = await readJson(mappingPath, null)
  if (!mappingDocument) summary.blockers = [...(summary.blockers ?? []), "Reviewed request mapping is unavailable"]
  const requiredSpecs = mappingDocument?.requiredSpecs ?? []
  let availableWeeklySpecs = []
  try {
    availableWeeklySpecs = await readdir(path.join(repositoryRoot, "cypress/monthly"))
  } catch {
    // Missing test files are reported as required-spec blockers below.
  }
  const missingRequiredSpecs = requiredSpecs.filter(specName => !availableWeeklySpecs.includes(specName))
  if (missingRequiredSpecs.length) {
    summary.blockers = [...(summary.blockers ?? []), `Required weekly specs are missing: ${missingRequiredSpecs.join(", ")}`]
  }
  summary.requiredWeeklySpecs = requiredSpecs.length
  summary.missingRequiredSpecs = missingRequiredSpecs
  const unverifiedWorkers = (mappingDocument?.externalWorkers ?? []).filter(worker => worker.evidenceStatus !== "verified")
  if (unverifiedWorkers.length) {
    summary.blockers = [...(summary.blockers ?? []), ...unverifiedWorkers.map(worker =>
      `External worker ${worker.name} is ${worker.evidenceStatus ?? "unverified"}`)]
  }
  const unavailableCapabilities = (mappingDocument?.blockedCapabilities ?? []).filter(capability => capability.status !== "verified")
  if (unavailableCapabilities.length) {
    summary.blockers = [...(summary.blockers ?? []), ...unavailableCapabilities.map(capability =>
      `Capability ${capability.name} is ${capability.status ?? "unverified"}`)]
  }
  const inventory = await readJson(path.join(artifactDirectory, "request-inventory.json"), { operations: [], operationCount: 0, unmappedCount: 0 })
  const savedCleanupSummary = await readJson(path.join(artifactDirectory, "cleanup.json"), null)
  const cleanupSummary = savedCleanupSummary?.runId === summary.runId ? savedCleanupSummary : null
  const currentCleanupStatus = cleanupSummary?.status ?? summary.cleanupStatus ?? "not_started"
  const evidenceRecords = filterEvidenceForRun(await readEvidenceRecords(), summary.runId)
  const paidSnapshot = await readJson(path.join(artifactDirectory, "paid-operations.json"), null)
  let paidEvents = []
  try {
    paidEvents = filterEvidenceForRun(
      parseEvidenceLines(await readFile(path.join(artifactDirectory, "paid-operations.jsonl"), "utf8")),
      summary.runId,
    )
  } catch {
    // The database snapshot remains authoritative if the local event file was not written.
  }
  const hasCurrentProviderSnapshot = paidSnapshot?.runId === summary.runId
  const providerRows = hasCurrentProviderSnapshot ? paidSnapshot.records ?? [] : []
  const providerJournalBlockers = []
  if (["weekly", "replay"].includes(summary.suite) && currentCleanupStatus !== "not_required"
    && (!hasCurrentProviderSnapshot || paidSnapshot.status !== "ready")) {
    providerJournalBlockers.push("Provider action history could not be read from the run journal")
  }
  if (providerRows.some(row => ["started", "unknown"].includes(row.status))) {
    providerJournalBlockers.push("One or more real provider actions have an unsettled or unknown outcome")
  }
  for (const row of providerRows) {
    if (row.status === "failed") {
      evidenceRecords.push({ kind: "provider-operation", status: "failed", message: `Real provider action ${row.capability} failed` })
    }
  }
  for (const event of paidEvents) {
    if (event.kind === "provider-operation-finished" && event.status === "failed") {
      evidenceRecords.push({ kind: "provider-operation", status: "failed", message: `Real provider action ${event.capability} failed` })
    }
  }
  const coverage = buildCoverage(inventory, evidenceRecords)
  const asyncCoverage = buildAsyncCoverage(inventory, evidenceRecords)
  const counts = countCoverage(coverage)
  summary.cleanupStatus = currentCleanupStatus
  if (cleanupSummary?.pending?.length) summary.blockers = [...(summary.blockers ?? []), `${cleanupSummary.pending.length} run-owned resources still need cleanup`]
  summary.blockers = [...new Set([...(summary.blockers ?? []), ...providerJournalBlockers])]
  summary.providerOperationJournalStatus = hasCurrentProviderSnapshot
    ? paidSnapshot.status
    : (summary.cleanupStatus === "not_required" ? "not_started" : "unavailable")
  summary.providerOperationCount = hasCurrentProviderSnapshot && paidSnapshot.status === "ready"
    ? providerRows.length
    : null
  summary.asyncCounts = {
    ...(inventory.asyncSummary ?? {}),
    listedAwaitExpressions: asyncCoverage.length,
    unmapped: asyncCoverage.filter(operation => operation.mappingStatus !== "mapped").length,
    needsSourceReview: asyncCoverage.filter(operation => operation.classification === "needs-review").length,
    requiredWithoutEvidence: asyncCoverage.filter(operation => operation.required && operation.status !== "passed").length,
    dependencyReview: inventory.dependencyReviewCount ?? 0,
  }
  summary.status = getFinalStatus(summary, coverage, counts, evidenceRecords, asyncCoverage)
  summary.operationCounts = {
    ...counts,
    discovered: coverage.length,
    executed: counts.passed + counts.failed,
    unexercised: counts.not_exercised + counts.blocked_by_configuration,
  }
  summary.evidenceDirectory = path.relative(repositoryRoot, artifactDirectory)

  const safeSummary = redactEvidence(summary)
  const safeCoverage = redactEvidence({ generatedAt: new Date().toISOString(), sourceCommit: inventory.sourceCommit, operations: coverage, asyncExpressions: asyncCoverage })
  await mkdir(artifactDirectory, { recursive: true })
  await Promise.all([
    writeFile(path.join(artifactDirectory, "summary.json"), `${JSON.stringify(safeSummary, null, 2)}\n`),
    writeFile(path.join(artifactDirectory, "request-coverage.json"), `${JSON.stringify(safeCoverage, null, 2)}\n`),
    writeFile(path.join(artifactDirectory, "report.md"), buildMarkdown(safeSummary, safeCoverage.operations, counts, safeCoverage.asyncExpressions, evidenceRecords)),
    writeFile(path.join(artifactDirectory, "ai-handoff.md"), buildHandoff(safeSummary, evidenceRecords)),
  ])
  return safeSummary
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const summary = await createE2EReport()
  console.log(JSON.stringify({ status: summary.status, operationCounts: summary.operationCounts, output: artifactDirectory }, null, 2))
}
