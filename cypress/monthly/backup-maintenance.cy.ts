import type { Interception } from "cypress/types/net-stubbing"

import { recordBlockedRoute, recordVerifiedRoute } from "./support"

type TSafeRequest = {
  method: "GET" | "POST"
  route: string
  requestUrl?: string
  body?: Record<string, unknown>
  acceptedStatuses: number[]
}

function verifySignedOutRequestIsRejected(input: TSafeRequest) {
  const alias = `guard-${input.route.replace(/[^a-z0-9]/gi, "-")}-${input.method.toLowerCase()}`
  const requestUrl = input.requestUrl ?? input.route
  cy.intercept(input.method, requestUrl).as(alias)
  return cy.window().then(browserWindow => browserWindow.fetch(requestUrl, {
    method: input.method,
    credentials: "include",
    ...(input.body ? {
      headers: { "content-type": "application/json" },
      body: JSON.stringify(input.body),
    } : {}),
  }).then(async response => ({ statusCode: response.status, body: await response.text() })))
    .then(result => cy.wait<Interception>(`@${alias}`).then(interception => {
      expect(input.acceptedStatuses, `${input.method} ${input.route} rejects the signed-out request`).to.include(result.statusCode)
      expect(result.body).not.to.match(/database url|service.role|secret key/i)
      if (result.statusCode === 401 || result.statusCode === 403) {
        return recordVerifiedRoute({
          method: input.method,
          route: input.route,
          scenarioId: "backup-maintenance",
          requestId: String(interception.id),
          verificationReference: `signed-out:${input.method}:${input.route}:http-${result.statusCode}:authorization-rejected-before-operation`,
          details: { expectedDeniedStatus: result.statusCode, noProviderMutation: true },
        })
      }
      return recordBlockedRoute(
        input.method,
        input.route,
        "backup-maintenance",
        `The route returned HTTP ${result.statusCode}; authorization behavior is not verified.`,
        { requestId: String(interception.id) },
      )
    }))
}

describe("monthly backup and maintenance safety gates", function () {
  this.timeout(180000)

  beforeEach(() => {
    cy.clearCookies()
    cy.clearLocalStorage()
    cy.visit("/")
  })

  it("rejects signed-out backup and storage operations before reading or changing data", () => {
    const requests: TSafeRequest[] = [
      { method: "GET", route: "/api/backup/rows", acceptedStatuses: [401, 403] },
      {
        method: "GET",
        route: "/api/backup/files",
        requestUrl: "/api/backup/files?bucketIndex=0&provider=r2",
        acceptedStatuses: [401, 403],
      },
      { method: "POST", route: "/api/backup/rows", body: { table: "23_categories", rows: [] }, acceptedStatuses: [401, 403] },
      { method: "POST", route: "/api/backup/files/complete", body: { uploadIds: [] }, acceptedStatuses: [401, 403] },
      { method: "POST", route: "/api/backup/relink-storage-urls", body: {}, acceptedStatuses: [401, 403] },
      { method: "POST", route: "/api/storage/cleanup", body: { mode: "staging", start: false }, acceptedStatuses: [401] },
      { method: "POST", route: "/api/webhooks/prices", body: {}, acceptedStatuses: [401, 503] },
    ]

    let chain = cy.then(() => ({ complete: true as const }))
    for (const request of requests) {
      chain = chain.then(() => verifySignedOutRequestIsRejected(request).then(() => ({ complete: true as const })))
    }
    return chain
  })

  it("records full backup imports and global jobs blocked until a separate test data store is verified", () => {
    const blockedOperations = [
      ["POST", "/api/backup/rows"],
      ["POST", "/api/backup/auth-users"],
      ["POST", "/api/backup/files"],
      ["POST", "/api/backup/files/complete"],
      ["POST", "/api/backup/relink-storage-urls"],
      ["POST", "/api/storage/cleanup"],
      ["POST", "/api/webhooks/prices"],
      ["POST", "/api/webhooks/check-envs"],
    ] as const
    let chain = cy.then(() => ({ complete: true as const }))
    for (const [method, route] of blockedOperations) {
      chain = chain.then(() => recordBlockedRoute(
        method,
        route,
        "backup-maintenance",
        "This operation can change global records and requires a separate deployed database and storage project with the production schema.",
      ).then(() => ({ complete: true as const })))
    }
    return chain
  })
})
