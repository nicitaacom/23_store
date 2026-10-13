import type { TDiagnosticEvidence } from "../scenarios/actions"

export type TRapidAction = {
  selector: string
  intendedOffsetMs: number
  name: string
}

type TRapidActionOptions = {
  scenarioId: string
  actions: TRapidAction[]
  allowedDelayMs?: number
}

function getImmediateControl(selector: string, scenarioId: string) {
  return cy.get(selector, { timeout: 0, log: false }).then($control => {
    const element = $control[0]
    const ownerDocument = element?.ownerDocument
    const elementConstructor = ownerDocument?.defaultView?.HTMLElement
    if (!element || !ownerDocument || !elementConstructor || !(element instanceof elementConstructor)) {
      throw new Error(`Rapid action control was not an HTML element: ${selector}`)
    }
    const bounds = element.getBoundingClientRect()
    const centerX = bounds.left + bounds.width / 2
    const centerY = bounds.top + bounds.height / 2
    const coveringElement = ownerDocument.elementFromPoint(centerX, centerY)
    const isCovered = !coveringElement || (coveringElement !== element && !element.contains(coveringElement))
    const computedStyle = ownerDocument.defaultView?.getComputedStyle(element)
    const isVisible = Boolean(computedStyle && element.getClientRects().length)
      && computedStyle?.display !== "none"
      && computedStyle?.visibility !== "hidden"
      && computedStyle?.opacity !== "0"
    const isDisabled = element.matches(":disabled") || element.getAttribute("aria-disabled") === "true"
    if (!isVisible || bounds.width === 0 || bounds.height === 0 || isDisabled || isCovered) {
      const failureEvidence: TDiagnosticEvidence = {
        kind: "rapid-action-blocked",
        scenarioId,
        selector,
        focusedElement: ownerDocument.activeElement?.getAttribute("data-cy") ?? null,
        coveringElement: coveringElement?.getAttribute("data-cy") ?? coveringElement?.tagName.toLowerCase() ?? null,
        route: ownerDocument.defaultView?.location.pathname ?? "unknown",
      }
      return cy.task("appendE2EEvidence", failureEvidence, { log: false }).then(() => {
        throw new Error(`Rapid action control is hidden, disabled, or covered: ${selector}`)
      })
    }
    return $control
  })
}

export function runRapidActions(options: TRapidActionOptions) {
  const allowedDelayMs = options.allowedDelayMs ?? 100
  let sequenceStartMs = 0
  cy.window({ log: false }).then(browserWindow => {
    sequenceStartMs = browserWindow.performance.now()
  })

  options.actions.forEach((action, actionIndex) => {
    cy.then(() => cy.window({ log: false }).then(browserWindow => {
      const intendedTimeMs = sequenceStartMs + action.intendedOffsetMs
      const remainingDelayMs = Math.max(0, intendedTimeMs - browserWindow.performance.now())
      if (remainingDelayMs > 0) return cy.wait(remainingDelayMs, { log: false })
      return undefined
    }))
    getImmediateControl(action.selector, options.scenarioId)
      .click({ timeout: 0, waitForAnimations: false, scrollBehavior: false })
    cy.window({ log: false }).then(browserWindow => {
      const clickRecord = (browserWindow as Window & { __e2eRunTimeline?: Array<Record<string, unknown>> }).__e2eRunTimeline
        ?.filter(record => record.kind === "click").at(-1)
      const actualTimeMs = Number(clickRecord?.performanceTimeMs)
      const intendedOffsetMs = action.intendedOffsetMs
      const achievedOffsetMs = actualTimeMs - sequenceStartMs
      const timingStatus = Math.abs(achievedOffsetMs - intendedOffsetMs) <= allowedDelayMs ? "passed" : "failed"
      const clickEvidence: TDiagnosticEvidence = {
        kind: "rapid-action-timing",
        status: timingStatus === "failed" ? "failed" : "passed",
        scenarioId: options.scenarioId,
        actionName: action.name,
        selector: action.selector,
        actionIndex,
        intendedOffsetMs,
        achievedOffsetMs,
        allowedDelayMs,
        timingStatus,
      }
      return cy.task("appendE2EEvidence", clickEvidence, { log: false })
    })
  })
}

export function runRapidBrowserBack(options: { scenarioId: string; intendedOffsetMs?: number; allowedDelayMs?: number }) {
  const intendedOffsetMs = options.intendedOffsetMs ?? 250
  const allowedDelayMs = options.allowedDelayMs ?? 100
  let sequenceStartMs = 0
  cy.window({ log: false }).then(browserWindow => {
    sequenceStartMs = browserWindow.performance.now()
  })
  cy.then(() => cy.window({ log: false }).then(browserWindow => {
    const remainingDelayMs = sequenceStartMs + intendedOffsetMs - browserWindow.performance.now()
    if (remainingDelayMs > 0) return cy.wait(remainingDelayMs, { log: false })
    return undefined
  }))
  cy.window({ log: false }).then(browserWindow => {
    const actualOffsetMs = browserWindow.performance.now() - sequenceStartMs
    const timingStatus = Math.abs(actualOffsetMs - intendedOffsetMs) <= allowedDelayMs ? "passed" : "failed"
    browserWindow.history.back()
    const evidence: TDiagnosticEvidence = {
      kind: "rapid-action-timing",
      status: timingStatus === "failed" ? "failed" : "passed",
      scenarioId: options.scenarioId,
      actionName: "browser-back-while-request-pending",
      actionType: "history-back",
      intendedOffsetMs,
      achievedOffsetMs: actualOffsetMs,
      allowedDelayMs,
      timingStatus,
    }
    return cy.task("appendE2EEvidence", evidence, { log: false })
  })
}
