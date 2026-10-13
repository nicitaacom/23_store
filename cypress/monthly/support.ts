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
  requestId: string
  scenarioId: string
  resourceId?: string
  providerId?: string
  verificationReference: string
  details?: Record<string, unknown>
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
    throw new Error("Verified service evidence needs the browser request id and an independent readback")
  }

  return cy.task<{ operationIds: string[] }>("findServiceOperation", {
    sourcePath: evidence.sourcePath,
    functionName: evidence.functionName,
    callName: evidence.callName,
    scenarioId: evidence.scenarioId,
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
  estimateName: string
  paidCallCount: number
}) {
  const estimatesText = Cypress.expose("E2E_OPERATION_COST_ESTIMATES_JSON")
  if (typeof estimatesText !== "string") throw new Error("E2E_OPERATION_COST_ESTIMATES_JSON is required before paid E2E actions")
  const estimates = JSON.parse(estimatesText) as Record<string, number>
  const estimatedCostPerCallUsd = Number(estimates[input.estimateName])
  if (!Number.isFinite(estimatedCostPerCallUsd) || estimatedCostPerCallUsd <= 0) {
    throw new Error(`A positive per-call provider cost estimate is required for ${input.estimateName}`)
  }
  const estimatedCostUsd = Number((estimatedCostPerCallUsd * input.paidCallCount).toFixed(6))
  return cy.task<{ allowed: boolean; reason?: string }>("reservePaidOperation", { ...input, estimatedCostUsd }, { log: false })
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
