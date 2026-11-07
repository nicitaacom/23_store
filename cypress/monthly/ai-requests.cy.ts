import type { Interception } from "cypress/types/net-stubbing"

import { recordVerifiedRoute } from "./support"

describe("monthly real-service AI request rejection", function () {
  this.timeout(120000)

  it("rejects an empty assistant question before a provider call", () => {
    cy.intercept("POST", "/api/ai").as("rejectEmptyAiQuestion")
    cy.request({
      method: "POST",
      url: "/api/ai",
      body: { prompt: "   " },
      failOnStatusCode: false,
    }).then(response => {
      expect(response.status, "empty AI question").to.equal(400)
      expect(response.body).to.deep.equal({
        message: "Enter a question before sending it to the AI assistant.",
      })
      expect(response.headers).not.to.have.property("x-openai-request-ids")
      return cy.wait<Interception>("@rejectEmptyAiQuestion", { timeout: 30000 })
    }).then(interception => recordVerifiedRoute({
      method: "POST",
      route: "/api/ai",
      scenarioId: "ai-tools",
      requestId: String(interception.id),
      resourceId: "empty-ai-question",
      verificationReference: "ai-input:empty-question:http-400:no-provider-request-id",
      details: { validationCase: "empty-question" },
    }))
  })

  it("rejects an unreadable assistant question before a provider call", () => {
    cy.intercept("POST", "/api/ai").as("rejectUnreadableAiQuestion")
    cy.request({
      method: "POST",
      url: "/api/ai",
      headers: { "content-type": "application/json" },
      body: "{",
      failOnStatusCode: false,
    }).then(response => {
      expect(response.status, "unreadable AI question").to.equal(400)
      expect(response.body).to.deep.equal({
        message: "The AI request could not be read. Enter a question and submit it again.",
      })
      expect(response.headers).not.to.have.property("x-openai-request-ids")
      return cy.wait<Interception>("@rejectUnreadableAiQuestion", { timeout: 30000 })
    }).then(interception => recordVerifiedRoute({
      method: "POST",
      route: "/api/ai",
      scenarioId: "ai-tools",
      requestId: String(interception.id),
      resourceId: "unreadable-ai-question",
      verificationReference: "ai-input:unreadable-question:http-400:no-provider-request-id",
      details: { validationCase: "unreadable-question" },
    }))
  })

  it("rejects an empty sales message before a provider call", () => {
    cy.intercept("POST", "/api/ai/sales-assistant").as("rejectEmptySalesMessage")
    cy.request({
      method: "POST",
      url: "/api/ai/sales-assistant",
      body: { promptValue: "" },
      failOnStatusCode: false,
    }).then(response => {
      expect(response.status, "empty sales message").to.equal(400)
      expect(response.body).to.deep.equal({
        error: "Enter a message before contacting the sales assistant.",
      })
      expect(response.headers).not.to.have.property("x-openai-request-ids")
      return cy.wait<Interception>("@rejectEmptySalesMessage", { timeout: 30000 })
    }).then(interception => recordVerifiedRoute({
      method: "POST",
      route: "/api/ai/sales-assistant",
      scenarioId: "ai-chat-memory",
      requestId: String(interception.id),
      resourceId: "empty-sales-message",
      verificationReference: "sales-input:empty-message:http-400:no-provider-request-id",
      details: { validationCase: "empty-sales-message" },
    }))
  })
})
