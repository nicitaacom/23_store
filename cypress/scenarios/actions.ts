export type TDiagnosticEvidence = {
  kind: string
  scenarioId: string
  operationId?: string
  status?: "passed" | "failed" | "blocked_by_configuration" | "not_exercised"
  requestId?: string
  providerId?: string
  resourceId?: string
  verificationReference?: string
  timingStatus?: "passed" | "failed"
  [evidenceKey: string]: unknown
}

export function recordOperationEvidence(evidence: TDiagnosticEvidence) {
  if (!evidence.operationId) throw new Error("Operation evidence requires an inventory operation id")
  if (evidence.status === "passed" && !(evidence.requestId || evidence.providerId || evidence.resourceId)) {
    throw new Error("A passed operation requires its real request, provider, or resource id")
  }
  if (evidence.status === "passed" && !evidence.verificationReference) {
    throw new Error("A passed operation requires an independent verification reference")
  }
  return cy.task("appendE2EEvidence", { ...evidence, at: new Date().toISOString() }, { log: false })
}

export function assertNoHttp200ErrorBody(response: Cypress.Response<unknown>) {
  const responseBody = response.body
  if (response.status === 200 && responseBody && typeof responseBody === "object"
    && ("error" in responseBody || ("success" in responseBody && responseBody.success === false))) {
    throw new Error("The application returned an error body with HTTP 200")
  }
}
