import { execFileSync } from "node:child_process"
import { createHash } from "node:crypto"
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises"
import path from "node:path"
import { fileURLToPath, pathToFileURL } from "node:url"
import Stripe from "stripe"


const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..")
const artifactDirectory = path.resolve(repositoryRoot, process.env.E2E_ARTIFACT_DIR ?? "artifacts/e2e")
const mappingPath = path.join(repositoryRoot, "cypress/coverage/request-map.json")
const paidCapabilitiesPath = path.join(repositoryRoot, "cypress/coverage/paid-capabilities.json")
const requiredSettings = [
  "NEXT_PUBLIC_PRODUCTION_URL",
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "E2E_TEST_EMAIL_DOMAIN",
  "E2E_TEST_PASSWORD",
  "E2E_MAX_PROVIDER_COST_USD",
  "E2E_MAX_PAID_OPERATIONS",
  "E2E_OPERATION_COST_ESTIMATES_JSON",
  "E2E_REPORT_FROM",
  "E2E_REPORT_TO",
  "NEXT_STRIPE_SECRET_KEY",
  "NEXT_RESEND_SECRET",
  "OPENAI_API_KEY",
  "AWS_ACCESS_KEY_ID",
  "AWS_SECRET_ACCESS_KEY",
  "NEXT_PUBLIC_AWS_REGION",
  "PUSHER_APP_ID",
  "NEXT_PUBLIC_PUSHER_APP_KEY",
  "PUSHER_SECRET",
  "UPSTASH_REDIS_REST_URL",
  "UPSTASH_REDIS_REST_TOKEN",
  "PINECONE_API_KEY",
  "PINECONE_INDEX",
  "PINECONE_ENVIRONMENT",
  "TINIFY_API_KEY_ARR",
  "DEVICE_ID_ENCRYPTION_KEY",
  "NEXT_PUBLIC_TURNSTILE_SITE_KEY",
  "TURNSTILE_SECRET_KEY",
  "PRICE_WEBHOOK_SECRET",
  "CRON_SECRET",
  "NEXT_PUBLIC_PAYPAL_CLIENT_ID_TEST",
  "PAYPAL_CLIENT_SECRET_TEST",
  "PAYPAL_WEBHOOK_ID_TEST",
  "TELEGRAM_BOT_TOKEN",
  "TELEGRAM_CHAT_ID",
  "NEXT_COINMARKETCAP_SECRET",
  "NEXT_PUBLIC_METAMASK_ADRESS_ETH",
  "NEXT_PUBLIC_METAMASK_ADRESS_BNB",
  "NEXT_PUBLIC_METAMASK_ADRESS_MATIC",
  "NEXT_PUBLIC_SOLANA_ADDRESS",
  "NEXT_PUBLIC_SOLANA_CLUSTER",
  "E2E_IMAGE_COMPRESSION_MAX_PROVIDER_CALLS",
  "E2E_CATEGORY_SUGGESTION_MAX_PROVIDER_CALLS",
  "E2E_TRANSLATION_MAX_PROVIDER_CALLS",
  "E2E_TRANSLATE_FIELD_MAX_PROVIDER_CALLS",
  "E2E_AI_PRICING_MAX_PROVIDER_CALLS",
  "E2E_AI_IMAGE_MAX_PROVIDER_CALLS",
  "E2E_PRINT_AREA_MAX_PROVIDER_CALLS",
  "E2E_SALES_CHAT_MAX_PROVIDER_CALLS",
  "E2E_MEMORY_MAX_PROVIDER_CALLS",
  "E2E_PRICE_RESEARCH_MAX_PROVIDER_CALLS",
  "E2E_COINMARKETCAP_MAX_PROVIDER_CALLS",
]
const conditionalSettings = {
  r2: ["R2_ACCOUNT_ID", "R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY", "R2_BUCKET", "NEXT_PUBLIC_R2_PUBLIC_URL"],
  supabaseStorage: ["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"],
  paypal: ["NEXT_PUBLIC_PAYPAL_CLIENT_ID_TEST", "PAYPAL_CLIENT_SECRET_TEST", "PAYPAL_WEBHOOK_ID_TEST"],
  telegram: ["TELEGRAM_BOT_TOKEN", "TELEGRAM_CHAT_ID"],
  coinmarketcap: ["NEXT_COINMARKETCAP_SECRET"],
}

export function getMissingSettings(environment = process.env) {
  const missingSettings = requiredSettings.filter(settingName => !environment[settingName])
  const storageProvider = environment.STORAGE_PROVIDER ?? "r2"
  const selectedStorageSettings = storageProvider === "supabase" ? conditionalSettings.supabaseStorage : conditionalSettings.r2
  const missingConditional = [...selectedStorageSettings]
    .filter(settingName => !environment[settingName])
  return [...new Set([...missingSettings, ...missingConditional])]
}

export function validatePaidCapabilityBudget(environment, paidCapabilities, blockers = []) {
  let estimates = {}
  try {
    estimates = JSON.parse(environment.E2E_OPERATION_COST_ESTIMATES_JSON ?? "")
  } catch {
    blockers.push("E2E_OPERATION_COST_ESTIMATES_JSON must be valid JSON with a positive estimate for every paid capability")
  }
  if (!estimates || typeof estimates !== "object" || Array.isArray(estimates)) estimates = {}

  const capabilityResults = (paidCapabilities.capabilities ?? []).map(capability => {
    const estimateUsd = Number(estimates[capability.estimateName])
    const maxProviderCalls = Number(environment[capability.callCountSetting])
    const minimumProviderCalls = Number(capability.minimumProviderCalls ?? 1)
    const validEstimate = Number.isFinite(estimateUsd) && estimateUsd > 0
    const validCallCount = Number.isInteger(maxProviderCalls) && maxProviderCalls >= minimumProviderCalls
    if (!validEstimate) blockers.push(`A positive cost estimate is required for ${capability.estimateName}`)
    if (!validCallCount) blockers.push(`${capability.callCountSetting} must be a whole number of at least ${minimumProviderCalls}`)
    const estimatedCostForCapability = validEstimate && validCallCount
      ? Number((estimateUsd * maxProviderCalls).toFixed(6))
      : null
    return {
      name: capability.name,
      estimateName: capability.estimateName,
      estimateUsd: validEstimate ? estimateUsd : null,
      estimatedCostUsd: estimatedCostForCapability,
      maxProviderCalls: validCallCount ? maxProviderCalls : null,
      minimumProviderCalls,
      scenarioId: capability.scenarioId,
    }
  })
  const estimatesComplete = capabilityResults.every(capability => capability.estimatedCostUsd !== null)
  const estimatedCostUsd = estimatesComplete
    ? Number(capabilityResults.reduce((total, capability) => total + capability.estimatedCostUsd, 0).toFixed(6))
    : null
  const maxProviderCalls = estimatesComplete
    ? capabilityResults.reduce((total, capability) => total + capability.maxProviderCalls, 0)
    : null
  const costLimit = Number(environment.E2E_MAX_PROVIDER_COST_USD)
  const callLimit = Number(environment.E2E_MAX_PAID_OPERATIONS)
  if (Number.isFinite(costLimit) && costLimit > 0 && estimatedCostUsd !== null && estimatedCostUsd > costLimit) {
    blockers.push(`Paid capability estimates total $${estimatedCostUsd.toFixed(4)}, above E2E_MAX_PROVIDER_COST_USD`)
  }
  if (Number.isInteger(callLimit) && callLimit > 0 && maxProviderCalls !== null && maxProviderCalls > callLimit) {
    blockers.push(`Paid capability call limits total ${maxProviderCalls}, above E2E_MAX_PAID_OPERATIONS`)
  }
  if (environment.E2E_REPORT_FROM !== "e2e-test-23-store@nicitaa.com"
    || environment.E2E_REPORT_TO !== "support@nicitaa.com") {
    blockers.push("Monthly report delivery must use e2e-test-23-store@nicitaa.com to support@nicitaa.com")
  }
  return { capabilities: capabilityResults, estimatedCostUsd, maxProviderCalls }
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
  const cronSecret = environment.CRON_SECRET
  const runId = environment.E2E_RUN_ID
  const route = "POST /api/e2e/stripe-mode"
  const operationId = `route-${createHash("sha256").update("/api/e2e/stripe-mode:POST").digest("hex").slice(0, 16)}`

  if (!productionUrl || !cronSecret || !runId) {
    return {
      name: "deployed-stripe",
      status: "blocked_by_configuration",
      detail: "Production URL, CRON_SECRET, and E2E_RUN_ID are required to verify the deployed Stripe mode",
      route,
      operationId,
    }
  }

  try {
    const response = await fetch(new URL("/api/e2e/stripe-mode", productionUrl), {
      method: "POST",
      redirect: "error",
      headers: { authorization: `Bearer ${cronSecret}`, "x-e2e-run-id": runId },
      signal: AbortSignal.timeout(65000),
    })
    let result = {}
    try {
      result = await response.json()
    } catch {
      // A non-JSON response cannot prove provider mode or cleanup.
    }

    const mode = result.mode === "test" || result.mode === "live" ? result.mode : "unknown"
    const hasVerifiedTestResource = response.ok && mode === "test"
      && typeof result.accountId === "string"
      && result.resourceVerified === true && result.livemode === false
      && result.cleanupStatus === "verified"
    const status = hasVerifiedTestResource ? "passed"
      : mode === "live" ? "blocked_by_configuration"
        : response.status >= 500 && result.productId ? "failed"
          : "blocked_by_configuration"
    const detail = hasVerifiedTestResource
      ? `Production returned Stripe TEST product ${result.productId}; livemode is false and the product is archived`
      : mode === "live"
        ? "The deployed Stripe key is live; no Stripe resource was created"
        : `Deployed Stripe mode check returned HTTP ${response.status}; no successful TEST-mode readback was recorded`

    return {
      name: "deployed-stripe",
      status,
      detail,
      route,
      operationId,
      mode,
      livemode: typeof result.livemode === "boolean" ? result.livemode : null,
      accountId: typeof result.accountId === "string" ? result.accountId : null,
      chargesEnabled: typeof result.chargesEnabled === "boolean" ? result.chargesEnabled : null,
      productId: typeof result.productId === "string" ? result.productId : null,
      resourceVerified: result.resourceVerified === true,
      cleanupStatus: result.cleanupStatus ?? "unknown",
      verificationReference: hasVerifiedTestResource
        ? `stripe-product:${result.productId}:livemode-false:inactive`
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
    ["23_e2e_paid_run_budgets", "suite_name"],
    ["23_e2e_paid_operation_ledger", "id"],
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
    detail: failedTables.length ? `Required run-journal tables are unavailable: ${failedTables.join(", ")}` : "Resource and paid-operation journals are available",
    tables: checks,
  }
}

export async function buildPreflight(environment = process.env) {
  const currentCommit = getCurrentCommit()
  const worktreeClean = getWorktreeClean()
  const missingSettings = getMissingSettings(environment)
  const blockers = missingSettings.map(settingName => `Missing required setting: ${settingName}`)
  const providerBudgetUsd = Number(environment.E2E_MAX_PROVIDER_COST_USD)
  const paidOperationLimit = Number(environment.E2E_MAX_PAID_OPERATIONS)

  if (!Number.isFinite(providerBudgetUsd) || providerBudgetUsd <= 0) {
    blockers.push("E2E_MAX_PROVIDER_COST_USD must be a positive finite amount")
  }
  if (!Number.isInteger(paidOperationLimit) || paidOperationLimit <= 0) {
    blockers.push("E2E_MAX_PAID_OPERATIONS must be a positive whole number")
  }
  if (environment.STORAGE_PROVIDER && !["r2", "supabase"].includes(environment.STORAGE_PROVIDER)) {
    blockers.push("STORAGE_PROVIDER must be either r2 or supabase")
  }

  const mappingDocument = JSON.parse(await readFile(mappingPath, "utf8"))
  const paidCapabilities = JSON.parse(await readFile(paidCapabilitiesPath, "utf8"))
  const paidCapabilityBudget = validatePaidCapabilityBudget(environment, paidCapabilities, blockers)
  const monthlyDirectory = path.join(repositoryRoot, "cypress/monthly")
  let availableSpecs = []
  try {
    availableSpecs = await readdir(monthlyDirectory)
  } catch {
    // Missing scenario files are reported below.
  }
  const missingSpecs = (mappingDocument.requiredSpecs ?? []).filter(specName => !availableSpecs.includes(specName))
  if (missingSpecs.length) blockers.push(`Required monthly specs are missing: ${missingSpecs.join(", ")}`)

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
  for (const worker of mappingDocument.externalWorkers ?? []) {
    if (worker.evidenceStatus !== "verified") blockers.push(`External worker ${worker.name} is ${worker.evidenceStatus ?? "unverified"}: ${worker.evidence ?? "source and terminal execution evidence are required"}`)
  }
  for (const capability of mappingDocument.blockedCapabilities ?? []) {
    if (capability.status !== "verified") blockers.push(`Capability ${capability.name} is ${capability.status ?? "unverified"}: ${capability.evidence ?? "real provider implementation and evidence are required"}`)
  }
  if (!worktreeClean) blockers.push("Runner source has uncommitted changes and is not the exact deployed build")

  // Do not spend Actions time or contact the production site/providers while the local
  // inventory, scenarios, settings, costs, or source revision are already incomplete.
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
    if (deployedStripeCheck.accountId && stripeCheck.accountId && deployedStripeCheck.accountId !== stripeCheck.accountId) {
      deployedStripeCheck.status = "blocked_by_configuration"
      deployedStripeCheck.detail = "Runner Stripe TEST key and deployed Stripe TEST key belong to different accounts; no browser mutation is safe"
    }
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
    suite: environment.E2E_SUITE ?? "monthly",
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
    paidCapabilityBudget,
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
    paidBudgetUsd: Number.isFinite(providerBudgetUsd) && providerBudgetUsd > 0 ? providerBudgetUsd : null,
    paidOperationLimit: Number.isInteger(paidOperationLimit) && paidOperationLimit > 0 ? paidOperationLimit : null,
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
