type TExpectedRejection = { method: string; pathname: string; statusCode: number }
type TDiagnosticRecord = { kind: string; at: string; [recordKey: string]: unknown }
type TDiagnosticWindow = Window & { __e2eRunTimeline?: TDiagnosticRecord[]; console: Console }

const expectedRejections: TExpectedRejection[] = []
const requestStarts = new Map<string, TDiagnosticRecord>()
const runnerDiagnostics: TDiagnosticRecord[] = []
let diagnosticsInstalled = false
let activeScenarioId = "unassigned"
let requestSequence = 0

function safePath(url: string) {
  try {
    const parsedUrl = new URL(url)
    return `${parsedUrl.origin}${parsedUrl.pathname}`
  } catch {
    return "unparsed-request-url"
  }
}

function routePath(url: string) {
  try {
    return new URL(url).pathname
  } catch {
    return "unparsed-request-path"
  }
}

function safeMessage(value: unknown) {
  return String(value)
    .replace(/Bearer\s+[^\s,;]+/gi, "Bearer [REDACTED]")
    .replace(/(password|secret|token|authorization|cookie)=?[^\s,;]*/gi, "$1=[REDACTED]")
    .slice(0, 400)
}

function elementDescription(element: Element | null) {
  if (!element) return null
  return {
    tagName: element.tagName.toLowerCase(),
    testId: element.getAttribute("data-cy"),
    role: element.getAttribute("role"),
    text: element.textContent?.trim().slice(0, 120) ?? "",
  }
}

function getFocusedState(browserWindow: Window) {
  const focusedElement = browserWindow.document.activeElement
  if (!focusedElement) return { focused: null, covering: null }
  const bounds = focusedElement.getBoundingClientRect()
  const centerX = bounds.left + bounds.width / 2
  const centerY = bounds.top + bounds.height / 2
  const coveringElement = browserWindow.document.elementFromPoint(centerX, centerY)
  return { focused: elementDescription(focusedElement), covering: elementDescription(coveringElement) }
}

function hasHttpErrorBody(body: unknown) {
  return Boolean(body && typeof body === "object" && ("error" in body || ("success" in body && body.success === false)))
}

function isExpectedRejection(method: string, pathname: string, statusCode: number) {
  const matchIndex = expectedRejections.findIndex(rejection => rejection.method === method && rejection.pathname === pathname
    && rejection.statusCode === statusCode)
  if (matchIndex < 0) return false
  expectedRejections.splice(matchIndex, 1)
  return true
}

function installDiagnostics() {
  if (diagnosticsInstalled || !["monthly", "replay"].includes(String(Cypress.env("E2E_SUITE")))) return
  diagnosticsInstalled = true
  // eslint-disable-next-line local-rules/no-banned-words -- Cypress event API name
  Cypress.on("window:before:load", (browserWindow: TDiagnosticWindow) => {
    browserWindow.__e2eRunTimeline = []
    browserWindow.addEventListener("pointerdown", pointerEvent => {
      const pointerNode = pointerEvent.target as Node | null
      const pointerElement = pointerNode?.nodeType === 1 ? pointerNode as Element : null
      browserWindow.__e2eRunTimeline?.push({ kind: "pointerdown", at: new Date().toISOString(), performanceTimeMs: browserWindow.performance.now(), element: elementDescription(pointerElement) })
    }, true)
    browserWindow.addEventListener("click", clickEvent => {
      const clickNode = clickEvent.target as Node | null
      const clickElement = clickNode?.nodeType === 1 ? clickNode as Element : null
      browserWindow.__e2eRunTimeline?.push({ kind: "click", at: new Date().toISOString(), performanceTimeMs: browserWindow.performance.now(), element: elementDescription(clickElement) })
    }, true)
    browserWindow.addEventListener("error", errorEvent => {
      browserWindow.__e2eRunTimeline?.push({ kind: "window-error", at: new Date().toISOString(), message: safeMessage(errorEvent.message), ...getFocusedState(browserWindow) })
    })
    browserWindow.addEventListener("unhandledrejection", rejectionEvent => {
      browserWindow.__e2eRunTimeline?.push({ kind: "unhandled-rejection", at: new Date().toISOString(), message: safeMessage(rejectionEvent.reason), ...getFocusedState(browserWindow) })
    })
    const originalConsoleError = browserWindow.console.error.bind(browserWindow.console)
    const originalConsoleInfo = browserWindow.console.info.bind(browserWindow.console)
    browserWindow.console.info = (...consoleArguments: unknown[]) => {
      if (consoleArguments[0] === "[products] received product:created") {
        const eventDetails = consoleArguments[1] && typeof consoleArguments[1] === "object"
          ? consoleArguments[1] as { product?: { id?: string; owner_id?: string; title?: string; price_id?: string } }
          : {}
        browserWindow.__e2eRunTimeline?.push({
          kind: "product-created-pusher-event",
          at: new Date().toISOString(),
          productId: eventDetails.product?.id ?? null,
          ownerId: eventDetails.product?.owner_id ?? null,
          priceId: eventDetails.product?.price_id ?? null,
          title: safeMessage(eventDetails.product?.title ?? ""),
        })
      }
      originalConsoleInfo(...consoleArguments)
    }
    browserWindow.console.error = (...consoleArguments: unknown[]) => {
      browserWindow.__e2eRunTimeline?.push({ kind: "console-error", at: new Date().toISOString(), message: safeMessage(consoleArguments.join(" ")) })
      originalConsoleError(...consoleArguments)
    }
  })

  Cypress.on("uncaught:exception", exception => {
    runnerDiagnostics.push({ kind: "uncaught-exception", at: new Date().toISOString(), message: safeMessage(exception.message) })
  })
  Cypress.on("fail", exception => {
    runnerDiagnostics.push({ kind: "test-failure", at: new Date().toISOString(), scenarioId: activeScenarioId, message: safeMessage(exception.message) })
    throw exception
  })
}

export function beginDiagnostics(scenarioId: string) {
  installDiagnostics()
  activeScenarioId = scenarioId
  expectedRejections.splice(0, expectedRejections.length)
  requestStarts.clear()
  runnerDiagnostics.splice(0, runnerDiagnostics.length)
  requestSequence = 0
  if (!["monthly", "replay"].includes(String(Cypress.env("E2E_SUITE")))) return

  cy.intercept({ url: "**" }, request => {
    const requestId = `${scenarioId}-${++requestSequence}`
    const pathname = routePath(request.url)
    const startRecord: TDiagnosticRecord = {
      kind: "request-start",
      at: new Date().toISOString(),
      scenarioId,
      requestId,
      method: request.method,
      pathname,
    }
    requestStarts.set(requestId, startRecord)
    request.on("after:response", response => {
      const expected = isExpectedRejection(request.method, pathname, response.statusCode)
      const errorBody = response.statusCode === 200 && hasHttpErrorBody(response.body)
      const requestRecord = {
        kind: "request-finish",
        at: new Date().toISOString(),
        scenarioId,
        requestId,
        method: request.method,
        pathname,
        statusCode: response.statusCode,
        expectedRejection: expected,
        errorBody,
        status: errorBody || (response.statusCode >= 400 && !expected) ? "failed" : "passed",
        message: errorBody ? "HTTP 200 response contained an error body"
          : response.statusCode >= 400 && !expected ? `Unexpected HTTP ${response.statusCode} response` : undefined,
      }
      requestStarts.delete(requestId)
      runnerDiagnostics.push(requestRecord)
    })
  })
}

export function expectRealRejection(rejection: TExpectedRejection) {
  expectedRejections.push(rejection)
}

export function finishDiagnostics() {
  if (!["monthly", "replay"].includes(String(Cypress.env("E2E_SUITE")))) return
  cy.window({ log: false }).then(browserWindow => {
    const browserTimeline = (browserWindow as TDiagnosticWindow).__e2eRunTimeline ?? []
    const timeline = [...browserTimeline, ...runnerDiagnostics]
    const pendingRequests = [...requestStarts.values()].map(requestStart => ({ ...requestStart, kind: "pending-request" }))
    const missingExpectedRejections = expectedRejections.map(rejection => ({ kind: "expected-rejection-missing", at: new Date().toISOString(), ...rejection }))
    const diagnosticFailure = timeline.find(record => ["console-error", "window-error", "unhandled-rejection", "uncaught-exception", "test-failure"].includes(String(record.kind)))
      ?? timeline.find(record => record.kind === "request-finish" && record.status === "failed")
      ?? (pendingRequests.length ? pendingRequests[0] : null)
      ?? (missingExpectedRejections.length ? missingExpectedRejections[0] : null)
    const record = {
      kind: "scenario-diagnostics",
      status: diagnosticFailure ? "failed" : "passed",
      scenarioId: activeScenarioId,
      route: safePath(browserWindow.location.href),
      message: diagnosticFailure ? `Browser diagnostics recorded ${diagnosticFailure.kind}` : "Browser diagnostics completed without recorded errors",
      timeline,
      pendingRequests,
      missingExpectedRejections,
    }
    return cy.task("appendE2EEvidence", record, { log: false })
  })
}
