import { execFileSync } from "node:child_process"
import { createHash } from "node:crypto"
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises"
import path from "node:path"
import { fileURLToPath, pathToFileURL } from "node:url"
import Stripe from "stripe"


const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..")
const artifactDirectory = path.resolve(repositoryRoot, process.env.E2E_ARTIFACT_DIR ?? "artifacts/e2e")
const mappingPath = path.join(repositoryRoot, "cypress/coverage/request-map.json")
const providerCapabilitiesPath = path.join(repositoryRoot, "cypress/coverage/provider-capabilities.json")
const requiredSettings = [
  "NEXT_PUBLIC_PRODUCTION_URL",
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "NEXT_STRIPE_SECRET_KEY",
]

export function getMissingSettings(environment = process.env) {
  return requiredSettings.filter(settingName => !environment[settingName])
}

export function describeProviderCallPlan(providerCapabilities) {
  return {
    capabilities: (providerCapabilities.capabilities ?? []).map(capability => ({
      name: capability.name,
      scenarioId: capability.scenarioId,
    })),
    policy: "The suite performs each declared action once, records real provider attempts, and uses only retry limits implemented by the application.",
  }
}

function getCurrentCommit() {
  return execFileSync("git", ["rev-parse", "HEAD"], { cwd: repositoryRoot, encoding: "utf8" }).trim()
}

function getWorktreeClean() {
  return execFileSync("git", ["status", "--porcelain"], { cwd: repositoryRoot, encoding: "utf8" }).trim().length === 0
}

function safeProductionOrigin(productionUrl) {
  try {
    return productionUrl ? new URL(productionUrl).origin : null
  } catch {
    return null
  }
}

function getProductionDeploymentSha() {
  try {
    const deploymentText = execFileSync("gh", ["api", "repos/nicitaacom/23_store/deployments?environment=Production&per_page=1", "--jq", ".[0].sha"], {
      cwd: repositoryRoot,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim()
    return deploymentText && deploymentText !== "null" ? deploymentText : null
  } catch {
    return null
  }
}

async function checkProductionSite(productionUrl) {
  if (!productionUrl) return { name: "production-site", status: "blocked_by_configuration", detail: "NEXT_PUBLIC_PRODUCTION_URL is missing" }
  try {
    const response = await fetch(productionUrl, { method: "HEAD", redirect: "follow", signal: AbortSignal.timeout(15000) })
    return {
      name: "production-site",
      status: response.ok ? "passed" : "failed",
      detail: `HTTP ${response.status}; host ${new URL(productionUrl).host}`,
      httpStatus: response.status,
      vercelId: response.headers.get("x-vercel-id"),
    }
  } catch (error) {
    return { name: "production-site", status: "blocked_by_configuration", detail: `Request failed: ${error.message}` }
  }
}

async function checkSupabase(environment) {
  const supabaseUrl = environment.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = environment.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const serviceRoleKey = environment.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    return { name: "supabase", status: "blocked_by_configuration", detail: "URL, anon key, and service-role key are required" }
  }

  try {
    const healthResponse = await fetch(`${supabaseUrl.replace(/\/$/, "")}/auth/v1/health`, {
      headers: { apikey: anonKey },
      signal: AbortSignal.timeout(15000),
    })
    const productsResponse = await fetch(`${supabaseUrl.replace(/\/$/, "")}/rest/v1/23_products?select=id&limit=0`, {
      headers: { apikey: serviceRoleKey, authorization: `Bearer ${serviceRoleKey}` },
      signal: AbortSignal.timeout(15000),
    })
    const detail = `host ${new URL(supabaseUrl).host}; Auth HTTP ${healthResponse.status}; products table HTTP ${productsResponse.status}`
    await Promise.all([healthResponse.body?.cancel(), productsResponse.body?.cancel()])
    return {
      name: "supabase",
      status: healthResponse.ok && productsResponse.ok ? "passed" : "blocked_by_configuration",
      detail,
      authStatus: healthResponse.status,
      productsStatus: productsResponse.status,
    }
  } catch (error) {
    return { name: "supabase", status: "blocked_by_configuration", detail: `Read-only checks failed: ${error.message}` }
  }
}

async function checkConfiguredStripe(environment) {
  const stripeKey = environment.NEXT_STRIPE_SECRET_KEY
  if (!stripeKey) return { name: "runner-stripe", status: "blocked_by_configuration", detail: "NEXT_STRIPE_SECRET_KEY is missing" }
  if (!stripeKey.startsWith("sk_test_")) {
    return { name: "runner-stripe", status: "blocked_by_configuration", detail: "The configured runner key is not a Stripe TEST key; no payment operation was started" }
  }

  try {
    const stripeClient = new Stripe(stripeKey)
    const account = await stripeClient.accounts.retrieve()
    return {
      name: "runner-stripe",
      status: "passed",
      detail: `TEST key accepted by account ${account.id}; charges enabled: ${account.charges_enabled}`,
      accountId: account.id,
      chargesEnabled: account.charges_enabled,
      keyMode: "test",
    }
  } catch (error) {
    return { name: "runner-stripe", status: "blocked_by_configuration", detail: `Read-only account check failed: ${error.message}` }
  }
}

async function checkDeployedStripe(environment) {
  const productionUrl = environment.NEXT_PUBLIC_PRODUCTION_URL
  const route = "GET /api/e2e/stripe-mode"
  const operationId = `route-${createHash("sha256").update("/api/e2e/stripe-mode:GET").digest("hex").slice(0, 16)}`

  if (!productionUrl) {
    return {
      name: "deployed-stripe",
      status: "blocked_by_configuration",
      detail: "Production URL is required to verify the deployed Stripe mode",
      route,
      operationId,
    }
  }

  try {
    const response = await fetch(new URL("/api/e2e/stripe-mode", productionUrl), {
      method: "GET",
      redirect: "error",
      signal: AbortSignal.timeout(65000),
    })
    let result = {}
    try {
      result = await response.json()
    } catch {
      // A non-JSON response cannot prove provider mode or cleanup.
    }

    const mode = result.mode === "test" || result.mode === "live" ? result.mode : "unknown"
    const hasVerifiedTestKey = response.ok && mode === "test" && result.livemode === false
    const status = hasVerifiedTestKey ? "passed"
      : mode === "live" ? "blocked_by_configuration"
        : "blocked_by_configuration"
    const detail = hasVerifiedTestKey
      ? "Production checkout is configured for Stripe TEST mode; no payment resource was created"
      : mode === "live"
        ? "The deployed Stripe key is live; no payment operation was started"
        : `Deployed Stripe mode check returned HTTP ${response.status}; no successful TEST-mode readback was recorded`

    return {
      name: "deployed-stripe",
      status,
      detail,
      route,
      operationId,
      mode,
      livemode: typeof result.livemode === "boolean" ? result.livemode : null,
      chargesEnabled: typeof result.chargesEnabled === "boolean" ? result.chargesEnabled : null,
      resourceVerified: hasVerifiedTestKey,
      cleanupStatus: "not_required",
      verificationReference: hasVerifiedTestKey
        ? "production-stripe-mode:test:livemode-false:read-only"
        : null,
    }
  } catch (error) {
    return {
      name: "deployed-stripe",
      status: "blocked_by_configuration",
      detail: `Read-only mode check could not reach the production route: ${error.message}`,
      route,
      operationId,
    }
  }
}

async function checkE2EJournal(environment, supabaseCheck) {
  if (supabaseCheck.status !== "passed") {
    return { name: "e2e-journal", status: "blocked_by_configuration", detail: "Skipped because Supabase is unavailable" }
  }
  const supabaseUrl = environment.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "")
  const serviceRoleKey = environment.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceRoleKey) {
    return { name: "e2e-journal", status: "blocked_by_configuration", detail: "Supabase service-role access is required" }
  }

  const journalTables = [
    ["23_e2e_resource_registry", "id"],
  ]
  const checks = await Promise.all(journalTables.map(async ([tableName, selectedColumn]) => {
    try {
      const response = await fetch(`${supabaseUrl}/rest/v1/${tableName}?select=${selectedColumn}&limit=0`, {
        headers: { apikey: serviceRoleKey, authorization: `Bearer ${serviceRoleKey}` },
        signal: AbortSignal.timeout(10000),
      })
      await response.body?.cancel()
      return { tableName, status: response.ok ? "passed" : "blocked_by_configuration", httpStatus: response.status }
    } catch (error) {
      return { tableName, status: "blocked_by_configuration", detail: `Read-only check failed: ${error.message}` }
    }
  }))
  const failedTables = checks.filter(check => check.status !== "passed").map(check => check.tableName)
  return {
    name: "e2e-journal",
    status: failedTables.length ? "blocked_by_configuration" : "passed",
    detail: failedTables.length ? `Required run-journal tables are unavailable: ${failedTables.join(", ")}` : "Run-owned resource journal is available",
    tables: checks,
  }
}

export async function buildPreflight(environment = process.env) {
  const currentCommit = getCurrentCommit()
  const worktreeClean = getWorktreeClean()
  const missingSettings = getMissingSettings(environment)
  const blockers = missingSettings.map(settingName => `Missing required setting: ${settingName}`)
  if (environment.STORAGE_PROVIDER && !["r2", "supabase"].includes(environment.STORAGE_PROVIDER)) {
    blockers.push("STORAGE_PROVIDER must be either r2 or supabase")
  }

  const mappingDocument = JSON.parse(await readFile(mappingPath, "utf8"))
  const providerCapabilities = JSON.parse(await readFile(providerCapabilitiesPath, "utf8"))
  const providerCallPlan = describeProviderCallPlan(providerCapabilities)
  const weeklyJourneyDirectory = path.join(repositoryRoot, "cypress/monthly")
  let availableSpecs = []
  try {
    availableSpecs = await readdir(weeklyJourneyDirectory)
  } catch {
    // Missing scenario files are reported below.
  }
  const missingSpecs = (mappingDocument.requiredSpecs ?? []).filter(specName => !availableSpecs.includes(specName))
  if (missingSpecs.length) blockers.push(`Required weekly specs are missing: ${missingSpecs.join(", ")}`)

  const inventoryPath = path.join(artifactDirectory, "request-inventory.json")
  let inventory = null
  try {
    inventory = JSON.parse(await readFile(inventoryPath, "utf8"))
  } catch {
    blockers.push("Request inventory has not been generated")
  }
  if (inventory && (!Array.isArray(inventory.operations) || !Number.isInteger(inventory.operationCount)
    || inventory.operationCount <= 0 || !Number.isInteger(inventory.unmappedCount))) {
    blockers.push("Request inventory is empty or has an invalid structure")
  } else if (inventory?.unmappedCount) {
    blockers.push(`${inventory.unmappedCount} discovered operations have no reviewed scenario mapping`)
  }
  const dependencyReviewCount = inventory?.operations?.filter(operation => operation.dependencyReviewStatus === "needs_review").length ?? 0
  if (dependencyReviewCount) {
    blockers.push(`${dependencyReviewCount} provider or realtime operations still need their calling business operation linked in the source inventory`)
  }
  if (inventory?.unmappedAsyncCount) {
    blockers.push(`${inventory.unmappedAsyncCount} awaited, returned, chained, or background expressions have no scenario mapping`)
  }
  if (inventory?.unclassifiedAsyncCount) {
    blockers.push(`${inventory.unclassifiedAsyncCount} awaited, returned, chained, or background expressions still need source review to distinguish provider requests from local work`)
  }
  const staleRouteMappings = (mappingDocument.routePatterns ?? []).filter(rule => rule.required
    && !inventory?.operations?.some(operation => operation.operationKind === "http-route"
      && (!rule.method || operation.method === rule.method)
      && new RegExp(rule.pattern).test(operation.route)))
  if (staleRouteMappings.length) {
    blockers.push(`Required route mappings no longer match discovered source routes: ${staleRouteMappings.map(rule => rule.pattern).join(", ")}`)
  }
  const unverifiedWorkers = (mappingDocument.externalWorkers ?? []).filter(worker => worker.evidenceStatus !== "verified")
  const blockedCapabilities = (mappingDocument.blockedCapabilities ?? []).filter(capability => capability.status !== "verified")
  if (!worktreeClean) blockers.push("Runner source has uncommitted changes and is not the exact deployed build")

  // Run every safe mapped browser journey with the production app's own service configuration.
  // Unverified workers/capabilities remain visible in final coverage, but do not stop independent journeys.
  const canCheckRemoteServices = blockers.length === 0
  const skippedCheck = name => ({ name, status: "blocked_by_configuration", detail: "Skipped because local prerequisites are incomplete; no remote request was made" })
  let productionSha = null
  let productionSiteCheck
  let supabaseCheck
  let stripeCheck
  let deployedStripeCheck
  let e2eJournalCheck
  if (canCheckRemoteServices) {
    productionSha = getProductionDeploymentSha()
    productionSiteCheck = await checkProductionSite(environment.NEXT_PUBLIC_PRODUCTION_URL)
    supabaseCheck = await checkSupabase(environment)
    stripeCheck = await checkConfiguredStripe(environment)
    deployedStripeCheck = await checkDeployedStripe(environment)
    e2eJournalCheck = await checkE2EJournal(environment, supabaseCheck)
    if (productionSiteCheck.status !== "passed") blockers.push("Production website health check did not pass")
    if (!productionSha) blockers.push("Production deployment commit could not be resolved")
    else if (productionSha !== currentCommit) blockers.push(`Runner source ${currentCommit} differs from production ${productionSha}`)
    if (supabaseCheck.status !== "passed") blockers.push("Supabase Auth and product-table read checks did not pass")
    if (e2eJournalCheck.status !== "passed") blockers.push(e2eJournalCheck.detail)
    if (stripeCheck.status !== "passed") blockers.push("Stripe TEST runner access did not pass")
    if (stripeCheck.chargesEnabled === false) blockers.push("The Stripe TEST account has charges disabled")
    if (deployedStripeCheck.status !== "passed") blockers.push(deployedStripeCheck.detail)
    if (deployedStripeCheck.chargesEnabled === false) blockers.push("The deployed Stripe TEST account has charges disabled")
  } else {
    productionSiteCheck = skippedCheck("production-site")
    supabaseCheck = skippedCheck("supabase")
    stripeCheck = skippedCheck("runner-stripe")
    deployedStripeCheck = skippedCheck("deployed-stripe")
    e2eJournalCheck = skippedCheck("e2e-journal")
  }
  const checks = [productionSiteCheck, supabaseCheck, stripeCheck, deployedStripeCheck, e2eJournalCheck]

  const targetUrl = safeProductionOrigin(environment.NEXT_PUBLIC_PRODUCTION_URL)

  const summary = {
    schemaVersion: 1,
    suite: environment.E2E_SUITE ?? "weekly",
    status: blockers.length ? "INCOMPLETE" : "PASS",
    generatedAt: new Date().toISOString(),
    runId: environment.E2E_RUN_ID ?? null,
    targetUrl,
    targetHost: targetUrl ? new URL(targetUrl).host : null,
    productionSha,
    runnerSha: currentCommit,
    runnerWorktreeClean: worktreeClean,
    providerModes: { runnerStripe: stripeCheck.keyMode ?? "unknown", deployedStripe: deployedStripeCheck.mode ?? "unknown" },
    missingSettings,
    missingSpecs,
    providerCallPlan,
    unverifiedWorkers: unverifiedWorkers.map(worker => ({ name: worker.name, status: worker.evidenceStatus })),
    blockedCapabilities: blockedCapabilities.map(capability => ({ name: capability.name, status: capability.status })),
    checks,
    blockers,
    operationCounts: {
      mapped: inventory ? inventory.operationCount - inventory.unmappedCount : 0,
      discovered: inventory?.operationCount ?? 0,
      awaited: inventory?.asyncExpressionCount ?? 0,
      unmappedAwaited: inventory?.unmappedAsyncCount ?? 0,
      awaitingSourceReview: inventory?.unclassifiedAsyncCount ?? 0,
      listedAsyncExpressions: inventory?.asyncExpressionCount ?? 0,
      dependencyReview: dependencyReviewCount,
      staleRouteMappings: staleRouteMappings.map(rule => rule.pattern),
      executed: 0,
      passed: 0,
      failed: 0,
      unexercised: inventory?.operationCount ?? 0,
    },
    cleanupStatus: "not_required",
    evidenceDirectory: path.relative(repositoryRoot, artifactDirectory),
  }

  return summary
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const preflightSummary = await buildPreflight()
  await mkdir(artifactDirectory, { recursive: true })
  await writeFile(path.join(artifactDirectory, "summary.json"), `${JSON.stringify(preflightSummary, null, 2)}\n`)
  console.log(JSON.stringify(preflightSummary, null, 2))
  if (preflightSummary.status !== "PASS") process.exitCode = 2
}
