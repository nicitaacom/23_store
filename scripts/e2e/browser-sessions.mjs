import { appendFile, mkdir, readFile } from "node:fs/promises"
import path from "node:path"
import { fileURLToPath, pathToFileURL } from "node:url"
import { randomUUID } from "node:crypto"

import { chromium, firefox, webkit } from "playwright"

import { createMonthlyFixtureManager } from "./fixtures.mjs"
import { reconcileResources } from "./cleanup.mjs"

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..")
const artifactDirectory = path.resolve(repositoryRoot, process.env.E2E_ARTIFACT_DIR ?? "artifacts/e2e")
const browserTypes = { chromium, firefox, webkit }

function safeUrl(value) {
  const parsedUrl = new URL(value)
  return `${parsedUrl.origin}${parsedUrl.pathname}`
}

function safeMessage(value) {
  return String(value)
    .replace(/Bearer\s+[^\s,;]+/gi, "Bearer [REDACTED]")
    .replace(/(password|secret|token|authorization|cookie)=?[^\s,;]*/gi, "$1=[REDACTED]")
    .slice(0, 400)
}

function matchesInventoryRoute(routePattern, actualPath) {
  const patternSegments = routePattern.split("/")
  const actualSegments = actualPath.split("/")
  let optionalCatchAll = false
  if (patternSegments.at(-1)?.startsWith(":") && patternSegments.at(-1)?.endsWith("*?")) {
    patternSegments.pop()
    optionalCatchAll = true
  }
  if ((!optionalCatchAll && patternSegments.length !== actualSegments.length)
    || (optionalCatchAll && actualSegments.length < patternSegments.length)) return false
  return patternSegments.every((segment, index) => segment.startsWith(":") || segment === actualSegments[index])
}

function findRouteOperation(inventory, method, pathname) {
  return inventory.operations.find(operation => operation.operationKind === "http-route"
    && operation.method === method.toUpperCase()
    && matchesInventoryRoute(operation.route, pathname))
}

function recordForSession(sessionName, kind, details = {}) {
  return { kind, sessionName, at: new Date().toISOString(), ...details }
}

function fillScenarioValues(value, variables) {
  if (typeof value !== "string") return value
  return value.replace(/\{\{([a-zA-Z0-9_.-]+)\}\}/g, (placeholder, key) => {
    const resolvedValue = key.split(".").reduce((current, part) => current?.[part], variables)
    if (resolvedValue === undefined || resolvedValue === null) throw new Error(`Scenario value ${key} is unavailable`)
    return String(resolvedValue)
  })
}

async function executeAction(page, action, actionIndex, sessionName, timeline, scenarioStartMs, variables, onRouteResponse, inventory) {
  const actionStart = Date.now()
  if (action.type === "goto") await page.goto(new URL(fillScenarioValues(action.path, variables), page.url()).toString())
  else if (action.type === "fill") {
    const value = action.valueFrom === "email" ? process.env[action.emailVariable ?? "E2E_SESSION_EMAIL"]
      : action.valueFrom === "password" ? process.env.E2E_TEST_PASSWORD
        : fillScenarioValues(action.value, variables)
    if (typeof value !== "string") throw new Error(`Browser action ${actionIndex} has no configured fill value`)
    await page.locator(fillScenarioValues(action.selector, variables)).fill(value)
  } else if (action.type === "click") {
    const selector = fillScenarioValues(action.selector, variables)
    const locator = page.locator(selector)
    const state = await locator.evaluate(element => {
      const bounds = element.getBoundingClientRect()
      const centerX = bounds.left + bounds.width / 2
      const centerY = bounds.top + bounds.height / 2
      const ownerDocument = element.ownerDocument
      const coveringElement = ownerDocument.elementFromPoint(centerX, centerY)
      return {
        visible: bounds.width > 0 && bounds.height > 0,
        enabled: !(element instanceof ownerDocument.defaultView.HTMLButtonElement || element instanceof ownerDocument.defaultView.HTMLInputElement) || !element.disabled,
        covered: !coveringElement || (coveringElement !== element && !element.contains(coveringElement)),
      }
    })
    if (!state.visible || !state.enabled || state.covered) throw new Error(`Browser action ${actionIndex} target is hidden, disabled, or covered`)
    if (action.targetAtMs !== undefined) {
      const delayMs = action.targetAtMs - (Date.now() - scenarioStartMs)
      if (delayMs > 0) await page.waitForTimeout(delayMs)
    }
    const responseWaiters = (action.responsePaths ?? []).map(pathname => page.waitForResponse(response => {
      try { return new URL(response.url()).pathname === pathname } catch { return false }
    }, { timeout: action.responseTimeoutMs ?? 30000 }))
    await locator.click({ timeout: action.timeoutMs ?? 1000, noWaitAfter: action.noWaitAfter ?? false })
    const responses = await Promise.all(responseWaiters)
    for (const response of responses) {
      const pathname = new URL(response.url()).pathname
      timeline.push(recordForSession(sessionName, "real-route-response", {
        status: response.ok() ? "passed" : "failed",
        method: response.request().method(),
        route: pathname,
        httpStatus: response.status(),
      }))
      const routeRecordIndex = timeline.length - 1
      if (!response.ok()) throw new Error(`${sessionName} real request ${pathname} returned HTTP ${response.status()}`)
      const verification = await onRouteResponse(response, sessionName)
      const routeOperation = findRouteOperation(inventory, response.request().method(), pathname)
      timeline[routeRecordIndex] = {
        ...timeline[routeRecordIndex],
        ...(routeOperation ? { operationId: routeOperation.operationId } : {}),
        requestId: response.headers()["x-vercel-id"] ?? response.headers()["x-request-id"]
          ?? `${sessionName}:${actionIndex}:${pathname}`,
        ...(verification ?? {}),
      }
    }
  } else if (action.type === "press") await page.locator(fillScenarioValues(action.selector, variables)).press(action.key)
  else if (action.type === "select") await page.locator(fillScenarioValues(action.selector, variables)).selectOption(fillScenarioValues(action.value, variables))
  else if (action.type === "waitFor") await page.locator(fillScenarioValues(action.selector, variables)).waitFor({ state: action.state ?? "visible", timeout: action.timeoutMs ?? 10000 })
  else throw new Error(`Unsupported browser action type: ${action.type}`)

  timeline.push(recordForSession(sessionName, "action", {
    actionIndex,
    actionType: action.type,
    selector: action.selector ?? null,
    intendedAtMs: action.targetAtMs ?? null,
    elapsedMs: Date.now() - scenarioStartMs,
    actionDurationMs: Date.now() - actionStart,
    route: safeUrl(page.url()),
  }))
}

async function signIn(page, account, timeline, sessionName) {
  await page.goto(new URL("/?modal=AuthModal&variant=login", process.env.E2E_BASE_URL).toString())
  const responsePromise = page.waitForResponse(response => response.url().includes("/api/auth/sync-public-user"), { timeout: 30000 })
  await page.locator("#email").fill(account.email)
  await page.locator("#password").fill(account.password)
  await page.locator('[data-cy="auth-submit"]').click()
  const response = await responsePromise
  timeline.push(recordForSession(sessionName, "real-login", { statusCode: response.status(), route: safeUrl(response.url()) }))
  if (!response.ok()) throw new Error(`${sessionName} login returned HTTP ${response.status()}`)
}

export async function runBrowserSessions(scenarioPath) {
  const baseUrl = process.env.E2E_BASE_URL ?? process.env.NEXT_PUBLIC_PRODUCTION_URL
  const password = process.env.E2E_TEST_PASSWORD
  if (!baseUrl || !password) throw new Error("Browser sessions require a base URL and E2E_TEST_PASSWORD")
  process.env.E2E_BASE_URL = baseUrl
  process.env.E2E_RUN_ID ??= `browser-${new Date().toISOString().replace(/[-:.TZ]/g, "")}-${randomUUID().slice(0, 8)}`
  const scenario = JSON.parse(await readFile(path.resolve(repositoryRoot, scenarioPath), "utf8"))
  const inventory = JSON.parse(await readFile(path.join(artifactDirectory, "request-inventory.json"), "utf8"))
  if (!Array.isArray(scenario.sessions) || !scenario.sessions.length) throw new Error("The browser session scenario must define sessions")
  const sessionNames = scenario.sessions.map(session => session.name)
  if (sessionNames.some(name => typeof name !== "string" || !/^[a-z0-9-]+$/i.test(name))
    || new Set(sessionNames).size !== sessionNames.length) throw new Error("Browser session names must be unique letters, numbers, and hyphens")
  const browserType = browserTypes[scenario.browser ?? "chromium"]
  if (!browserType) throw new Error("Browser must be chromium, firefox, or webkit")
  const fixtureManager = createMonthlyFixtureManager(process.env, { accountNamespace: "support-sessions" })
  const timeline = []
  const sessionPages = []
  const sessionContexts = []
  const expectedHttpErrors = scenario.expectedHttpErrors ?? []
  let variables = {}
  let supportTicketRegistered = false
  const scenarioStartMs = Date.now()
  let hasFailure = false
  let browser = null
  let cleanupSummary = null

  try {
    const accounts = await fixtureManager.createRunAccounts()
    variables = {
      runId: process.env.E2E_RUN_ID,
      ownerId: accounts.owner.id,
      supportId: accounts.support.id,
    }
    browser = await browserType.launch({ headless: true, ...(scenario.launchOptions ?? {}) })
    for (const session of scenario.sessions) {
      const account = accounts[session.role]
      if (!account) throw new Error(`Browser session ${session.name} requires an available fixture role`)
      const context = await browser.newContext({ viewport: session.viewport ?? { width: 1440, height: 900 } })
      const page = await context.newPage()
      sessionContexts.push(context)
      sessionPages.push({ name: session.name, page })
      page.on("console", message => {
        if (message.type() === "error") {
          hasFailure = true
          timeline.push(recordForSession(session.name, "console-error", { status: "failed", message: safeMessage(message.text()) }))
        }
      })
      page.on("pageerror", exception => {
        hasFailure = true
        timeline.push(recordForSession(session.name, "page-error", { status: "failed", message: safeMessage(exception.message) }))
      })
      page.on("response", response => {
        if (response.status() >= 400) {
          const pathname = new URL(response.url()).pathname
          const expected = expectedHttpErrors.some(rule => rule.statusCode === response.status() && rule.pathname === pathname)
          if (!expected) hasFailure = true
          timeline.push(recordForSession(session.name, "http-error", {
            status: expected ? "expected" : "failed",
            statusCode: response.status(),
            route: safeUrl(response.url()),
          }))
        }
      })
      await signIn(page, { email: account.email, password }, timeline, session.name)
    }

    for (const step of scenario.steps ?? []) {
      const sessionPage = sessionPages.find(candidate => candidate.name === step.session)
      if (!sessionPage) throw new Error(`Browser step names an unknown session: ${step.session}`)
      const onRouteResponse = async (response, sessionName) => {
        const pathname = new URL(response.url()).pathname
        if (pathname === "/api/tickets/open" && sessionName === "owner") {
          const request = response.request().postDataJSON()
          if (request?.ticketId !== accounts.owner.id || request?.ownerId !== accounts.owner.id) {
            throw new Error("Support ticket creation did not use the run-owned customer id")
          }
          await fixtureManager.recordCreatedResource({
            runId: process.env.E2E_RUN_ID,
            resourceType: "support_ticket",
            resourceId: accounts.owner.id,
            ownerId: accounts.owner.id,
            details: { scenarioId: scenario.id, ownerId: accounts.owner.id },
          })
          supportTicketRegistered = true
          const ticket = await fixtureManager.readRunSupportTicket(accounts.owner.id, accounts.owner.id)
          if (!ticket?.ticket.is_open) throw new Error("New support ticket was not independently read back from Supabase")
          return {
            resourceId: accounts.owner.id,
            verificationReference: ticket.verificationReference,
          }
        }
        if (pathname === "/api/message/send") {
          const request = response.request().postDataJSON()
          const ticket = await fixtureManager.readRunSupportTicket(accounts.owner.id, accounts.owner.id)
          const savedMessage = [...(ticket?.messages ?? [])].reverse().find(message =>
            message.ticket_id === request?.ticketId && message.body === request?.messageBody && message.sender_id === request?.senderId)
          if (!savedMessage || savedMessage.body !== request.messageBody || savedMessage.sender_id !== request.senderId) {
            throw new Error("Support message was not independently read back from Supabase")
          }
          if (request.messageSender === "support") {
            await fixtureManager.recordCreatedResource({
              runId: process.env.E2E_RUN_ID,
              resourceType: "pusher_event",
              resourceId: savedMessage.id,
              ownerId: accounts.owner.id,
              details: { scenarioId: scenario.id, event: "messages:new", ticketId: accounts.owner.id },
            })
          }
          return {
            resourceId: savedMessage.id,
            verificationReference: `${ticket.verificationReference}:message:${savedMessage.id}:body-and-sender-read-back`,
          }
        }
      }
      await executeAction(sessionPage.page, step, timeline.length, sessionPage.name, timeline, scenarioStartMs, variables, onRouteResponse, inventory)
    }

    if (scenario.assertions?.length) {
      for (const assertion of scenario.assertions) {
        const sessionPage = sessionPages.find(candidate => candidate.name === assertion.session)
        if (!sessionPage) throw new Error(`Browser assertion names an unknown session: ${assertion.session}`)
        const selector = fillScenarioValues(assertion.selector, variables)
        await sessionPage.page.locator(selector).waitFor({ state: assertion.state ?? "visible", timeout: assertion.timeoutMs ?? 10000 })
        if (assertion.text !== undefined) {
          const expectedText = fillScenarioValues(assertion.text, variables)
          const actualText = await sessionPage.page.locator(selector).innerText()
          if (!actualText.includes(expectedText)) throw new Error(`Browser assertion text did not match for ${selector}`)
        }
      }
    }
  } catch (error) {
    hasFailure = true
    timeline.push(recordForSession("runner", "failure", { status: "failed", message: error.message.slice(0, 500) }))
  } finally {
    await mkdir(path.join(artifactDirectory, "browser-sessions"), { recursive: true })
    for (const sessionPage of sessionPages) {
      await sessionPage.page.screenshot({ path: path.join(artifactDirectory, "browser-sessions", `${sessionPage.name}.png`), fullPage: true }).catch(() => undefined)
    }
    await Promise.all(sessionContexts.map(context => context.close()))
    await browser?.close()
    if (supportTicketRegistered) {
      try {
        const verificationReference = await fixtureManager.cleanupRunSupportTicket({
          ticketId: variables.ownerId,
          ownerId: variables.ownerId,
        })
        timeline.push(recordForSession("runner", "support-ticket-cleanup", { status: "passed", verificationReference }))
      } catch (error) {
        hasFailure = true
        timeline.push(recordForSession("runner", "support-ticket-cleanup", { status: "failed", message: safeMessage(error.message) }))
      }
    }
    cleanupSummary = await reconcileResources().catch(error => ({ status: "failed", detail: safeMessage(error.message), pending: [] }))
    await writeFile(path.join(artifactDirectory, "browser-sessions", "cleanup.json"), `${JSON.stringify(cleanupSummary, null, 2)}\n`)
    if (cleanupSummary.status !== "complete") hasFailure = true
    await appendFile(path.join(artifactDirectory, "coverage-events.jsonl"), `${JSON.stringify({
      kind: "browser-session-run",
      runId: process.env.E2E_RUN_ID,
      scenarioId: scenario.id ?? path.basename(scenarioPath),
      status: hasFailure ? "failed" : "passed",
      cleanupStatus: cleanupSummary.status,
      timeline,
    })}\n`)
  }

  if (hasFailure) process.exitCode = 1
  return { status: hasFailure ? "failed" : "passed", timeline }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const scenarioPath = process.argv[2]
  if (!scenarioPath) throw new Error("Usage: node scripts/e2e/browser-sessions.mjs <scenario.json>")
  const browserSessionSummary = await runBrowserSessions(scenarioPath)
  console.log(JSON.stringify({ status: browserSessionSummary.status, eventCount: browserSessionSummary.timeline.length }, null, 2))
}
