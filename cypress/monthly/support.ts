import type { Interception } from "cypress/types/net-stubbing"

type TRouteCoverageEvidence = {
  method: string
  route: string
  requestId?: string
  scenarioId: string
  resourceId?: string
  providerId?: string
  verificationReference: string
  details?: Record<string, unknown>
}

type TServiceCoverageEvidence = {
  sourcePath: string
  functionName: string
  callName: string
  fingerprint?: string
  requestId: string
  scenarioId: string
  operationScenarioId?: string
  resourceId?: string
  providerId?: string
  verificationReference: string
  details?: Record<string, unknown>
}

type TBlockedServiceEvidence = {
  sourcePath: string
  functionName: string
  callName: string
  scenarioId: string
  operationScenarioId?: string
  requestId?: string
  resourceId?: string
  providerId?: string
  message: string
}

type TRealtimeEvidence = {
  sourcePath: string
  functionName: string
  callName: string
  scenarioId: string
  operationScenarioId?: string
  resourceId?: string
  providerId?: string
  verificationReference: string
  details?: Record<string, unknown>
}

export type TOpenAIRequestEvidence = { requestIds: string[]; attemptCount: number }

export function readOpenAIRequestEvidence(
  interception: Interception,
  options: {
    headerPrefix?: "x-openai" | "x-openai-embedding"
    maxAttempts?: number
    requireEveryRequestId?: boolean
  } = {},
): TOpenAIRequestEvidence {
  const { headerPrefix = "x-openai", maxAttempts = 8, requireEveryRequestId = true } = options
  const responseHeaders = interception.response?.headers
  const requestIdsHeader = responseHeaders?.[`${headerPrefix}-request-ids`]
  const attemptCount = Number(responseHeaders?.[`${headerPrefix}-attempt-count`])
  expect(Number.isInteger(attemptCount), `${headerPrefix} reports an integer attempt count`).to.equal(true)
  expect(attemptCount, `${headerPrefix} attempts stay within the route's bounded retry policy`).to.be.within(1, maxAttempts)

  let requestIds: unknown = []
  if (requestIdsHeader) {
    try {
      requestIds = JSON.parse(String(requestIdsHeader)) as unknown
    } catch {
      throw new Error(`${headerPrefix} request ids are not valid JSON`)
    }
  }
  expect(requestIds, `${headerPrefix} request ids are an array`).to.be.an("array")
  const validRequestIds = requestIds as unknown[]
  expect(validRequestIds.every(requestId => typeof requestId === "string" && requestId.length > 0),
    `${headerPrefix} request ids are nonempty strings`).to.equal(true)
  expect(validRequestIds.length, `${headerPrefix} identified requests do not exceed actual attempts`).to.be.at.most(attemptCount)
  if (requireEveryRequestId) {
    expect(validRequestIds.length, `${headerPrefix} records every actual provider request`).to.equal(attemptCount)
  }

  return { requestIds: validRequestIds as string[], attemptCount }
}

export function recordVerifiedRoute(evidence: TRouteCoverageEvidence) {
  if ((!evidence.requestId && !evidence.providerId && !evidence.resourceId) || !evidence.verificationReference) {
    throw new Error("Verified route evidence needs an actual request/resource id and independent readback")
  }

  return cy.task<{ operationId: string; scenarioId?: string }>("findRouteOperation", {
    method: evidence.method,
    route: evidence.route,
  }).then(operation => {
    return cy.task("appendE2EEvidence", {
      kind: "coverage-event",
      operationId: operation.operationId,
      scenarioId: evidence.scenarioId,
      status: "passed",
      method: evidence.method.toUpperCase(),
      route: evidence.route,
      ...(evidence.requestId ? { requestId: evidence.requestId } : {}),
      ...(evidence.resourceId ? { resourceId: evidence.resourceId } : {}),
      ...(evidence.providerId ? { providerId: evidence.providerId } : {}),
      verificationReference: evidence.verificationReference,
      runId: Cypress.expose("E2E_RUN_ID"),
      testedCommit: Cypress.expose("E2E_RUNNER_SHA"),
      target: Cypress.config("baseUrl"),
      at: new Date().toISOString(),
      ...(evidence.details ? { details: evidence.details } : {}),
    }, { log: false })
  })
}

export function recordVerifiedServiceOperation(evidence: TServiceCoverageEvidence) {
  if (!evidence.requestId || !evidence.verificationReference) {
    throw new Error("Verified service evidence needs the provider request id and an independent readback")
  }

  return cy.task<{ operationIds: string[] }>("findServiceOperation", {
    sourcePath: evidence.sourcePath,
    functionName: evidence.functionName,
    callName: evidence.callName,
    ...(evidence.fingerprint ? { fingerprint: evidence.fingerprint } : {}),
    scenarioId: evidence.operationScenarioId ?? evidence.scenarioId,
  }).then(operation => {
    return cy.wrap(operation.operationIds, { log: false }).each(operationId => {
      return cy.task("appendE2EEvidence", {
        kind: "coverage-event",
        operationId,
        scenarioId: evidence.scenarioId,
        status: "passed",
        requestId: evidence.requestId,
        ...(evidence.resourceId ? { resourceId: evidence.resourceId } : {}),
        ...(evidence.providerId ? { providerId: evidence.providerId } : {}),
        verificationReference: evidence.verificationReference,
        runId: Cypress.expose("E2E_RUN_ID"),
        testedCommit: Cypress.expose("E2E_RUNNER_SHA"),
        target: Cypress.config("baseUrl"),
        at: new Date().toISOString(),
        ...(evidence.details ? { details: evidence.details } : {}),
      }, { log: false })
    })
  })
}

export function recordBlockedServiceOperation(evidence: TBlockedServiceEvidence) {
  return cy.task<{ operationIds: string[] }>("findServiceOperation", {
    sourcePath: evidence.sourcePath,
    functionName: evidence.functionName,
    callName: evidence.callName,
    scenarioId: evidence.operationScenarioId ?? evidence.scenarioId,
  }).then(operation => {
    return cy.wrap(operation.operationIds, { log: false }).each(operationId => {
      return cy.task("appendE2EEvidence", {
        kind: "coverage-event",
        operationId,
        scenarioId: evidence.scenarioId,
        status: "blocked_by_configuration",
        ...(evidence.requestId ? { requestId: evidence.requestId } : {}),
        ...(evidence.resourceId ? { resourceId: evidence.resourceId } : {}),
        ...(evidence.providerId ? { providerId: evidence.providerId } : {}),
        runId: Cypress.expose("E2E_RUN_ID"),
        testedCommit: Cypress.expose("E2E_RUNNER_SHA"),
        target: Cypress.config("baseUrl"),
        message: evidence.message,
        at: new Date().toISOString(),
      }, { log: false })
    })
  })
}

export function recordFailedServiceOperation(evidence: TBlockedServiceEvidence) {
  return cy.task<{ operationIds: string[] }>("findServiceOperation", {
    sourcePath: evidence.sourcePath,
    functionName: evidence.functionName,
    callName: evidence.callName,
    scenarioId: evidence.operationScenarioId ?? evidence.scenarioId,
  }).then(operation => {
    return cy.wrap(operation.operationIds, { log: false }).each(operationId => {
      return cy.task("appendE2EEvidence", {
        kind: "coverage-event",
        operationId,
        scenarioId: evidence.scenarioId,
        status: "failed",
        requestId: evidence.requestId,
        ...(evidence.resourceId ? { resourceId: evidence.resourceId } : {}),
        ...(evidence.providerId ? { providerId: evidence.providerId } : {}),
        runId: Cypress.expose("E2E_RUN_ID"),
        testedCommit: Cypress.expose("E2E_RUNNER_SHA"),
        target: Cypress.config("baseUrl"),
        message: evidence.message,
        at: new Date().toISOString(),
      }, { log: false })
    })
  })
}

export function recordVerifiedRealtimeOperation(evidence: TRealtimeEvidence) {
  if ((!evidence.resourceId && !evidence.providerId) || !evidence.verificationReference) {
    throw new Error("Verified realtime evidence needs an actual resource/event id and an independent readback")
  }

  return cy.task<{ operationId: string }>("findRealtimeOperation", {
    sourcePath: evidence.sourcePath,
    functionName: evidence.functionName,
    callName: evidence.callName,
    scenarioId: evidence.operationScenarioId ?? evidence.scenarioId,
  }).then(operation => cy.task("appendE2EEvidence", {
    kind: "coverage-event",
    operationId: operation.operationId,
    scenarioId: evidence.scenarioId,
    status: "passed",
    ...(evidence.resourceId ? { resourceId: evidence.resourceId } : {}),
    ...(evidence.providerId ? { providerId: evidence.providerId } : {}),
    verificationReference: evidence.verificationReference,
    runId: Cypress.expose("E2E_RUN_ID"),
    testedCommit: Cypress.expose("E2E_RUNNER_SHA"),
    target: Cypress.config("baseUrl"),
    at: new Date().toISOString(),
    ...(evidence.details ? { details: evidence.details } : {}),
  }, { log: false }))
}

export function recordBlockedRoute(
  method: string,
  route: string,
  scenarioId: string,
  detail: string,
  identifiers: { requestId?: string; resourceId?: string; providerId?: string } = {},
) {
  return cy.task<{ operationId: string }>("findRouteOperation", { method, route }).then(operation => {
    return cy.task("appendE2EEvidence", {
      kind: "coverage-event",
      operationId: operation.operationId,
      scenarioId,
      status: "blocked_by_configuration",
      method: method.toUpperCase(),
      route,
      ...identifiers,
      runId: Cypress.expose("E2E_RUN_ID"),
      testedCommit: Cypress.expose("E2E_RUNNER_SHA"),
      target: Cypress.config("baseUrl"),
      message: detail,
      at: new Date().toISOString(),
    }, { log: false })
  })
}

export function recordResource(resourceType: string, resourceId: string, ownerId: string, details: Record<string, unknown> = {}) {
  return cy.task("recordCreatedResource", {
    runId: Cypress.expose("E2E_RUN_ID"),
    resourceType,
    resourceId,
    ownerId,
    details,
  }, { log: false })
}

export function reservePaidScenarioOperation(input: {
  operationKey: string
  provider: string
  capability: string
  estimateName?: string
  paidCallCount: number
}) {
  return cy.task<{ allowed: boolean; reason?: string }>("reservePaidOperation", input, { log: false })
}

export function settlePaidScenarioOperation(input: {
  operationKey: string
  status: "completed" | "failed" | "unknown"
  providerResourceId?: string
  actualCostUsd?: number
  details?: Record<string, unknown>
}) {
  return cy.task("settlePaidOperation", input, { log: false })
}
