import type { Interception } from "cypress/types/net-stubbing"

import { recordResource, recordVerifiedRoute, recordVerifiedServiceOperation } from "./support"

type TRunAccount = { id: string; email: string; role: string }
type TRunAccounts = Record<"owner" | "other" | "support" | "admin", TRunAccount>
type TSupportMessage = { id: string; ticket_id: string; sender_id: string; sender_username: string; seen: boolean; body: string; images: string[] | null }
type TSupportTicket = { id: string; owner_id: string; is_open: boolean; last_message_body: string; rate?: number | null }
type TSupportReadback = { ticket: TSupportTicket; messages: TSupportMessage[]; verificationReference: string } | null
type TStorageReference = { provider: "r2" | "supabase"; bucket: string; path: string; publicUrl?: string }
type TStorageDestination = { reference: TStorageReference; uploadId: string; signedUrl: string; publicUrl?: string; headers: Record<string, string> }
const attachmentPath = "cypress/files/Sour Cream 30% Savya LITOVSKAYA.png"

const scenarioId = "support"

describe("monthly real-service support conversation", function () {
  this.timeout(180000)
  let accounts: TRunAccounts
  let ticketId = ""
  let resourceRegistered = false
  let attachmentReference: TStorageReference | null = null

  before(() => {
    cy.prepareRunAccounts().then(runAccounts => {
      accounts = runAccounts
    })
  })

  beforeEach(() => {
    ticketId = ""
    resourceRegistered = false
    attachmentReference = null
    cy.intercept("POST", "/api/telegram").as("telegramNotification")
    cy.intercept("POST", "/api/ticket/get-ticket-id").as("getTicketId")
    cy.intercept("POST", "/api/tickets/open").as("openTicket")
    cy.intercept("POST", "/api/message/send").as("sendSupportMessage")
    cy.intercept("POST", "/api/storage/prepare").as("prepareSupportAttachment")
    cy.intercept("POST", "/api/storage/complete").as("completeSupportAttachment")
    cy.intercept("POST", "/api/storage/delete").as("deleteSupportAttachment")
    cy.intercept("POST", "/api/message/seen", request => {
      request.alias = request.body?.userId === accounts.support.id ? "supportMarksMessageSeen" : "ownerMarksMessageSeen"
    })
    cy.intercept("POST", "/api/messages/get-messages").as("getSupportMessages")
    cy.intercept("POST", "/api/tickets/close").as("closeSupportTicket")
    cy.intercept("POST", "/api/tickets/rate").as("rateSupportTicket")
    cy.signIn(accounts.owner)
  })

  afterEach(() => {
    if (attachmentReference) {
      const reference = attachmentReference
      cy.signIn(accounts.owner)
      cy.request({ method: "POST", url: "/api/storage/delete", body: { reference }, failOnStatusCode: false })
        .then(response => {
          expect(response.status, "owner deletes the exact support attachment through the storage API").to.equal(200)
          return cy.wait<Interception>("@deleteSupportAttachment").then(interception =>
            cy.task<string>("verifyStorageObjectAbsent", reference).then(verificationReference => ({ interception, verificationReference })))
        }).then(({ interception, verificationReference }) => recordVerifiedRoute({
          method: "POST",
          route: "/api/storage/delete",
          scenarioId: "personalization-storage",
          requestId: interception.id,
          resourceId: reference.path,
          providerId: reference.bucket,
          verificationReference,
          details: { cleanup: true },
        }).then(() => cy.task("markRunStorageObjectCleaned", { ownerId: accounts.owner.id, reference })))
    }
    if (resourceRegistered && ticketId) {
      cy.task<string>("cleanupRunSupportTicket", { ticketId, ownerId: accounts.owner.id })
        .then(verificationReference => cy.task("appendE2EEvidence", {
          kind: "scenario-cleanup",
          status: "passed",
          scenarioId: "support",
          resourceId: ticketId,
          verificationReference,
          at: new Date().toISOString(),
        }, { log: false }))
    }
  })

  it("opens, replies, marks messages seen, closes and rates its own ticket", () => {
    const ownerMessage = `E2E support question ${String(Cypress.expose("E2E_RUN_ID")).slice(-16)}`
    const supportReply = `E2E support reply ${String(Cypress.expose("E2E_RUN_ID")).slice(-16)}`
    ticketId = accounts.owner.id

    cy.visit("/en")
    cy.get('[data-cy="open-support"]').click()
    cy.get('[data-cy="support-chat-panel"]').should("be.visible")
    cy.wait<Interception>("@getTicketId", { timeout: 30000 }).then(interception => {
      expect(interception.response?.statusCode).to.equal(200)
      expect(interception.response?.body, "run-owned account has no open ticket before this journey").to.equal("")
      return cy.task<TSupportReadback>("readRunSupportTicket", { ticketId, ownerId: accounts.owner.id }).then(readback => {
        expect(readback, "ticket lookup has no matching database row").to.equal(null)
        return recordVerifiedRoute({
          method: "POST",
          route: "/api/ticket/get-ticket-id",
          scenarioId,
          requestId: interception.id,
          resourceId: ticketId,
          verificationReference: `supabase:23_tickets:owner:${accounts.owner.id}:no-open-ticket`,
        })
      })
    })
    cy.wait<Interception>("@getSupportMessages", { timeout: 30000 }).then(interception => {
      expect(interception.response?.statusCode).to.equal(200)
      expect(interception.response?.body, "empty conversation lookup has no messages").to.deep.equal([])
      return recordVerifiedRoute({
        method: "POST",
        route: "/api/messages/get-messages",
        scenarioId,
        requestId: interception.id,
        resourceId: ticketId,
        verificationReference: `supabase:23_messages:ticket:${ticketId}:empty-before-open`,
      })
    })
    cy.get('[data-cy="support-message-input"]').type(ownerMessage)
    cy.get('[data-cy="support-message-send"]').should("be.enabled").click()

    let openInterception: Interception
    let ownerSendInterception: Interception
    let supportSendInterception: Interception
    let customerReadInterception: Interception
    let ratingInterception: Interception
    let completeAttachmentInterception: Interception
    let attachmentSendInterception: Interception
    cy.wait<Interception>("@telegramNotification", { timeout: 30000 }).then(interception => {
      expect(interception.response?.statusCode, "approved Telegram endpoint response").to.equal(200)
      const telegramResult = interception.response?.body?.data?.result
      const providerMessageId = telegramResult?.message_id
      const providerChatId = telegramResult?.chat?.id
      expect(providerMessageId, "actual Telegram message id").to.be.a("number")
      expect(String(providerChatId), "Telegram returned the actual receiving chat id").not.to.equal("")
      return recordVerifiedRoute({
        method: "POST",
        route: "/api/telegram",
        scenarioId: "notifications",
        requestId: interception.id,
        providerId: String(providerMessageId),
        resourceId: ticketId,
        verificationReference: `telegram:accepted-message:${providerMessageId}:support-ticket:${ticketId}`,
      }).then(() => recordVerifiedServiceOperation({
        sourcePath: "app/utils/sendTelegramMessage.ts",
        functionName: "sendTelegramMessage",
        callName: "fetch",
        requestId: String(interception.id),
        scenarioId: "notifications",
        operationScenarioId: "notifications",
        resourceId: ticketId,
        providerId: String(providerMessageId),
        verificationReference: `telegram:${providerMessageId}:actual-message:configured-chat-match`,
        details: { configuredChatMatched: true, providerAttempts: 1 },
      }))
    })
    cy.wait<Interception>("@openTicket", { timeout: 30000 }).then(interception => {
      openInterception = interception
      expect(interception.response?.statusCode).to.equal(200)
      expect(interception.request.body).to.include({ ticketId, ownerId: accounts.owner.id, messageBody: ownerMessage })
      return cy.task("recordCreatedResource", {
        runId: Cypress.expose("E2E_RUN_ID"),
        resourceType: "support_ticket",
        resourceId: ticketId,
        ownerId: accounts.owner.id,
        details: { scenarioId, ownerId: accounts.owner.id },
      })
    }).then(() => {
      resourceRegistered = true
    })
    cy.wait<Interception>("@sendSupportMessage", { timeout: 30000 }).then(interception => {
      ownerSendInterception = interception
      expect(interception.response?.statusCode).to.equal(200)
      expect(interception.request.body).to.include({ ticketId, senderId: accounts.owner.id, messageBody: ownerMessage, messageSender: "user" })
      return cy.task<TSupportReadback>("readRunSupportTicket", { ticketId, ownerId: accounts.owner.id })
    }).then(readback => {
      expect(resourceRegistered, "ticket cleanup obligation recorded before the rest of the journey").to.equal(true)
      expect(readback).not.to.equal(null)
      expect(readback?.ticket).to.include({ id: ticketId, owner_id: accounts.owner.id, is_open: true, last_message_body: ownerMessage })
      expect(readback?.messages).to.have.length(1)
      expect(readback?.messages[0]).to.include({ ticket_id: ticketId, sender_id: accounts.owner.id, body: ownerMessage })
      if (!readback || !openInterception || !ownerSendInterception) throw new Error("Customer support writeback is incomplete")
      return recordVerifiedRoute({
        method: "POST",
        route: "/api/tickets/open",
        scenarioId,
        requestId: openInterception.id,
        resourceId: ticketId,
        providerId: ticketId,
        verificationReference: readback.verificationReference,
      }).then(() => recordVerifiedRoute({
        method: "POST",
        route: "/api/message/send",
        scenarioId,
        requestId: ownerSendInterception.id,
        resourceId: readback.messages[0].id,
        providerId: ticketId,
        verificationReference: readback.verificationReference,
      }))
    })

    const attachmentMessage = `E2E support image ${String(Cypress.expose("E2E_RUN_ID")).slice(-16)}`
    cy.get('[data-cy="support-attachment-drop-zone"]').selectFile(attachmentPath, { action: "drag-drop" })
    cy.wait<Interception>("@prepareSupportAttachment", { timeout: 30000 }).then(interception => {
      expect(interception.response?.statusCode).to.equal(200)
      expect(interception.request.body).to.include({ bucket: "23_support-images", contentType: "image/png" })
      const destination = interception.response?.body as TStorageDestination
      expect(destination.reference).to.include({ bucket: "23_support-images" })
      const ownerFolder = accounts.owner.email.toLowerCase().replace(/[^a-z0-9]/g, "")
      expect(destination.reference.path).to.match(new RegExp(`^${ownerFolder}/`))
      attachmentReference = destination.reference
      return recordResource("storage_object", destination.reference.path, accounts.owner.id, {
        provider: destination.reference.provider,
        bucket: destination.reference.bucket,
        path: destination.reference.path,
        publicUrl: destination.publicUrl,
        scenarioId,
      }).then(() => recordVerifiedRoute({
        method: "POST",
        route: "/api/storage/prepare",
        scenarioId: "personalization-storage",
        requestId: interception.id,
        resourceId: destination.reference.path,
        providerId: destination.uploadId,
        verificationReference: `signed-upload:${destination.uploadId};owned-storage-path:${destination.reference.bucket}/${destination.reference.path}`,
      }))
    })
    cy.get('[data-cy="support-message-input"]').type(attachmentMessage)
    cy.get('[data-cy="support-message-send"]').should("be.enabled").click()
    let uploadedImageUrl = ""
    cy.wait<Interception>("@completeSupportAttachment", { timeout: 30000 }).then(interception => {
      completeAttachmentInterception = interception
      expect(interception.response?.statusCode).to.equal(200)
      uploadedImageUrl = String(interception.response?.body?.publicUrl ?? "")
      expect(uploadedImageUrl).to.contain(attachmentReference?.path)
      if (attachmentReference) attachmentReference = { ...attachmentReference, publicUrl: uploadedImageUrl }
      if (!attachmentReference) throw new Error("Support attachment reference was not retained after upload completion")
      return recordResource("storage_object", attachmentReference.path, accounts.owner.id, {
        provider: attachmentReference.provider,
        bucket: attachmentReference.bucket,
        path: attachmentReference.path,
        publicUrl: uploadedImageUrl,
        scenarioId,
      })
    }).then(() => {
      return cy.wait<Interception>("@sendSupportMessage", { timeout: 30000 })
    }).then(interception => {
      attachmentSendInterception = interception
      expect(interception.response?.statusCode).to.equal(200)
      expect(interception.request.body).to.include({ ticketId, senderId: accounts.owner.id, messageBody: attachmentMessage, messageSender: "user" })
      const sentMessage = interception.request.body as unknown as Record<string, unknown>
      expect(sentMessage.images).to.deep.equal([uploadedImageUrl])
      return cy.task<TSupportReadback>("readRunSupportTicket", { ticketId, ownerId: accounts.owner.id })
    }).then(readback => {
      expect(readback?.messages).to.have.length(2)
      expect(readback?.messages[1]).to.include({ sender_id: accounts.owner.id, body: attachmentMessage })
      expect(readback?.messages[1]).to.have.property("images").that.deep.equals([uploadedImageUrl])
      if (!readback || !uploadedImageUrl) throw new Error("Support attachment did not persist to the message")
      if (!attachmentSendInterception) throw new Error("Support attachment message request was not captured")
      return recordVerifiedRoute({
        method: "POST",
        route: "/api/message/send",
        scenarioId,
        requestId: attachmentSendInterception.id,
        resourceId: readback.messages[1].id,
        providerId: ticketId,
        verificationReference: `${readback.verificationReference};message:${readback.messages[1].id}:stored-image-url`,
      }).then(() => cy.request({ url: uploadedImageUrl, encoding: "base64" })).then(download => {
        expect(download.status).to.equal(200)
        expect(download.headers["content-type"]).to.contain("image/png")
        return cy.readFile(attachmentPath, "base64").then(expectedBytes => {
          expect(download.body, "public support object has exactly the supplied PNG bytes").to.equal(expectedBytes)
          return cy.task("appendE2EEvidence", {
            kind: "scenario-evidence",
            scenarioId,
            status: "passed",
            resourceId: readback.messages[1].id,
            providerId: attachmentReference?.path,
            verificationReference: `${readback.verificationReference};storage:${attachmentReference?.bucket}/${attachmentReference?.path}:sha-bytes-verified`,
            runId: Cypress.expose("E2E_RUN_ID"),
            testedCommit: Cypress.expose("E2E_RUNNER_SHA"),
            target: Cypress.config("baseUrl"),
            at: new Date().toISOString(),
          }, { log: false }).then(() => {
            if (!completeAttachmentInterception) throw new Error("Storage completion request was not captured")
            return recordVerifiedRoute({
              method: "POST",
              route: "/api/storage/complete",
              scenarioId: "personalization-storage",
              requestId: completeAttachmentInterception.id,
              resourceId: attachmentReference?.path,
              providerId: attachmentReference?.bucket,
              verificationReference: `public-object:${attachmentReference?.provider}:${attachmentReference?.bucket}/${attachmentReference?.path}:exact-png-bytes-read-back`,
            })
          })
        })
      })
    })

    cy.signIn(accounts.support)
    cy.visit("/en/support/tickets")
    cy.get(`[data-cy="support-ticket-row"][data-ticket-id="${ticketId}"]`).should("be.visible").click()
    cy.get('[data-cy="support-message-input"]').should("be.visible")
    cy.wait<Interception>("@supportMarksMessageSeen", { timeout: 30000 }).then(interception => {
      expect(interception.response?.statusCode).to.equal(200)
      return cy.task<TSupportReadback>("readRunSupportTicket", { ticketId, ownerId: accounts.owner.id }).then(readback => {
        expect(readback?.messages[0]?.seen, "support opened and marked the customer message read").to.equal(true)
        expect(readback?.messages[1]?.seen, "support also marked the customer attachment read").to.equal(true)
        if (!readback) throw new Error("Support ticket readback is missing")
        return recordVerifiedRoute({
          method: "POST",
          route: "/api/message/seen",
          scenarioId,
          requestId: interception.id,
          resourceId: readback.messages[0].id,
          providerId: ticketId,
          verificationReference: `${readback.verificationReference};customer-message:seen-by-support`,
          details: { viewerId: accounts.support.id },
        })
      })
    })

    cy.get('[data-cy="support-message-input"]').type(supportReply)
    cy.get('[data-cy="support-message-send"]').should("be.enabled").click()
    cy.wait<Interception>("@sendSupportMessage", { timeout: 30000 }).then(interception => {
      supportSendInterception = interception
      expect(interception.response?.statusCode).to.equal(200)
      expect(interception.request.body).to.include({ ticketId, senderId: accounts.support.id, messageBody: supportReply, messageSender: "support" })
      return cy.task<TSupportReadback>("readRunSupportTicket", { ticketId, ownerId: accounts.owner.id })
    }).then(readback => {
      expect(readback?.messages).to.have.length(3)
      expect(readback?.messages[2]).to.include({ sender_id: accounts.support.id, body: supportReply, seen: false })
      if (!readback) throw new Error("Support reply readback is missing")
      return recordVerifiedRoute({
        method: "POST",
        route: "/api/message/send",
        scenarioId,
        requestId: supportSendInterception.id,
        resourceId: readback.messages[2].id,
        providerId: ticketId,
        verificationReference: readback.verificationReference,
        details: { senderId: accounts.support.id },
      })
    })

    cy.signIn(accounts.owner)
    cy.visit("/en")
    cy.wait<Interception>("@getSupportMessages", { timeout: 30000 }).then(interception => {
      customerReadInterception = interception
      expect(interception.response?.statusCode).to.equal(200)
      expect(interception.response?.body).to.have.length(3)
      return cy.task<TSupportReadback>("readRunSupportTicket", { ticketId, ownerId: accounts.owner.id })
    }).then(readback => {
      expect(readback?.ticket.is_open).to.equal(true)
      expect(readback?.messages[2]?.body).to.equal(supportReply)
      if (!readback) throw new Error("Customer conversation reload readback is missing")
      return recordVerifiedRoute({
        method: "POST",
        route: "/api/messages/get-messages",
        scenarioId,
        requestId: customerReadInterception.id,
        resourceId: readback.messages[2].id,
        providerId: ticketId,
        verificationReference: readback.verificationReference,
      })
    })
    cy.get('[data-cy="open-support"]').click()
    cy.get('[data-cy="support-message"]').should("contain.text", supportReply)
    cy.wait<Interception>("@ownerMarksMessageSeen", { timeout: 30000 }).then(interception => {
      expect(interception.response?.statusCode).to.equal(200)
      return cy.task<TSupportReadback>("readRunSupportTicket", { ticketId, ownerId: accounts.owner.id }).then(readback => {
        expect(readback?.messages[2]?.seen, "customer opened and marked the support reply read").to.equal(true)
        if (!readback) throw new Error("Customer seen-state readback is missing")
        return recordVerifiedRoute({
          method: "POST",
          route: "/api/message/seen",
          scenarioId,
          requestId: interception.id,
          resourceId: readback.messages[2].id,
          providerId: ticketId,
          verificationReference: `${readback.verificationReference};support-message:seen-by-owner`,
          details: { viewerId: accounts.owner.id },
        })
      })
    })

    cy.get('[data-cy="close-support-ticket"]').should("be.enabled").click()
    cy.get('[data-cy="confirm-close-support-ticket"]').should("be.enabled").click()
    cy.wait<Interception>("@closeSupportTicket", { timeout: 30000 }).then(interception => {
      expect(interception.response?.statusCode).to.equal(200)
      expect(interception.request.body).to.deep.equal({ ticketId, closedBy: "user" })
      return cy.task<TSupportReadback>("readRunSupportTicket", { ticketId, ownerId: accounts.owner.id })
        .then(readback => ({ interception, readback }))
    }).then(({ interception, readback }) => {
      expect(readback?.ticket.is_open, "close persisted to the ticket row").to.equal(false)
      if (!readback) throw new Error("Closed support ticket readback is missing")
      return recordVerifiedRoute({
        method: "POST",
        route: "/api/tickets/close",
        scenarioId,
        requestId: interception.id,
        resourceId: ticketId,
        providerId: ticketId,
        verificationReference: `${readback.verificationReference};ticket:is_open-false`,
      })
    })

    cy.get('[data-cy="rate-support-ticket-5"]').should("be.visible").click()
    cy.wait<Interception>("@rateSupportTicket", { timeout: 30000 }).then(interception => {
      ratingInterception = interception
      expect(interception.response?.statusCode).to.equal(200)
      expect(interception.request.body).to.deep.equal({ ticketId, rate: 5 })
      return cy.task<TSupportReadback>("readRunSupportTicket", { ticketId, ownerId: accounts.owner.id })
    }).then(readback => {
      expect(readback?.ticket).to.include({ is_open: false, rate: 5 })
      if (!readback) throw new Error("Rated support ticket readback is missing")
      return recordVerifiedRoute({
        method: "POST",
        route: "/api/tickets/rate",
        scenarioId,
        requestId: ratingInterception.id,
        resourceId: ticketId,
        providerId: ticketId,
        verificationReference: `${readback.verificationReference};ticket:rating-5-and-closed`,
      })
    })
  })
})
