import type { Interception } from "cypress/types/net-stubbing"

import { expectRealRejection } from "../support/diagnostics"
import { recordVerifiedRoute } from "./support"

type TRunAccount = { id: string; email: string; password: string; role: string }
type TRunAccounts = Record<"owner" | "other" | "support" | "admin", TRunAccount>
type TRunProfile = {
  profile: { id: string; preferred_language: string | null; avatar_url: string | null }
  verificationReference: string
} | null

describe("monthly real-service account session and language", function () {
  this.timeout(180000)
  let accounts: TRunAccounts
  let originalOwnerLanguage: string | null = null
  let originalOtherLanguage: string | null = null
  let originalProfileSnapshotReady = false

  before(() => {
    cy.task<TRunAccounts>("prepareRunAccounts").then(runAccounts => {
      accounts = runAccounts
    })
  })

  beforeEach(() => {
    originalProfileSnapshotReady = false
    cy.intercept("POST", "/api/auth/login").as("accountLogin")
    cy.intercept("POST", "/api/account/language").as("updateAccountLanguage")
    cy.intercept("POST", "**/auth/v1/logout*").as("supabaseSignOut")
    cy.task<TRunProfile>("readRunUserProfile", accounts.owner.id).then(readback => {
      if (!readback) throw new Error("Run-owned owner profile is missing before the account journey")
      originalOwnerLanguage = readback.profile.preferred_language
      return cy.task<TRunProfile>("readRunUserProfile", accounts.other.id)
    }).then(readback => {
      if (!readback) throw new Error("Run-owned second profile is missing before the account journey")
      originalOtherLanguage = readback.profile.preferred_language
      originalProfileSnapshotReady = true
      return cy.signIn(accounts.owner)
    })
  })

  afterEach(() => {
    if (!originalProfileSnapshotReady) return
    cy.task<string>("restoreRunUserLanguage", { ownerId: accounts.owner.id, language: originalOwnerLanguage })
    cy.task<string>("restoreRunUserLanguage", { ownerId: accounts.other.id, language: originalOtherLanguage })
  })

  it("logs in, persists a locale per account, rejects invalid and signed-out updates", () => {
    cy.wait<Interception>("@accountLogin", { timeout: 30000 }).then(interception => {
      expect(interception.response?.statusCode).to.equal(200)
      expect(interception.request.body).to.deep.equal({ email: accounts.owner.email })
      return recordVerifiedRoute({
        method: "POST",
        route: "/api/auth/login",
        scenarioId: "auth-account",
        requestId: interception.id,
        resourceId: accounts.owner.id,
        verificationReference: `supabase-auth:run-owned-user:${accounts.owner.id}:authenticated`,
      })
    })

    let ownerLanguageInterception: Interception
    cy.window().then(browserWindow => browserWindow.fetch("/api/account/language", {
      method: "POST",
      credentials: "include",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ language: "ru" }),
    }).then(response => response.status)).then(status => {
      expect(status).to.equal(200)
      return cy.wait<Interception>("@updateAccountLanguage", { timeout: 30000 }).then(interception => {
        ownerLanguageInterception = interception
        expect(interception.response?.body).to.deep.equal({ success: true })
        return cy.task<TRunProfile>("readRunUserProfile", accounts.owner.id)
      })
    }).then(readback => {
      expect(readback?.profile.preferred_language).to.equal("ru")
      if (!readback) throw new Error("Owner language update was not found in Supabase")
      return recordVerifiedRoute({
        method: "POST",
        route: "/api/account/language",
        scenarioId: "auth-account",
        requestId: ownerLanguageInterception.id,
        resourceId: accounts.owner.id,
        verificationReference: `${readback.verificationReference}:ru`,
      })
    })

    let invalidLanguageInterception: Interception
    expectRealRejection({ method: "POST", pathname: "/api/account/language", statusCode: 400 })
    cy.window().then(browserWindow => browserWindow.fetch("/api/account/language", {
      method: "POST",
      credentials: "include",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ language: "xx-invalid" }),
    }).then(response => response.status)).then(status => {
      expect(status, "unsupported locale is rejected").to.equal(400)
      return cy.wait<Interception>("@updateAccountLanguage", { timeout: 30000 }).then(interception => {
        invalidLanguageInterception = interception
        return cy.task<TRunProfile>("readRunUserProfile", accounts.owner.id)
      })
    }).then(readback => {
      expect(readback?.profile.preferred_language, "invalid request leaves the saved locale alone").to.equal("ru")
      if (!readback) throw new Error("Owner profile readback is missing after invalid locale request")
      return recordVerifiedRoute({
        method: "POST",
        route: "/api/account/language",
        scenarioId: "auth-account",
        requestId: invalidLanguageInterception.id,
        resourceId: accounts.owner.id,
        verificationReference: `${readback.verificationReference}:still-ru-after-400`,
        details: { expectedHttpStatus: 400 },
      })
    })

    cy.signIn(accounts.other)
    let otherLanguageInterception: Interception
    cy.window().then(browserWindow => browserWindow.fetch("/api/account/language", {
      method: "POST",
      credentials: "include",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ language: "fi" }),
    }).then(response => response.status)).then(status => {
      expect(status).to.equal(200)
      return cy.wait<Interception>("@updateAccountLanguage", { timeout: 30000 }).then(interception => {
        otherLanguageInterception = interception
        return cy.task<TRunProfile>("readRunUserProfile", accounts.other.id)
      })
    }).then(otherReadback => {
      expect(otherReadback?.profile.preferred_language).to.equal("fi")
      return cy.task<TRunProfile>("readRunUserProfile", accounts.owner.id).then(ownerReadback => {
        expect(ownerReadback?.profile.preferred_language, "second account update did not change the owner locale").to.equal("ru")
        if (!otherReadback || !ownerReadback) throw new Error("Run-owned account language readback is missing")
        return recordVerifiedRoute({
          method: "POST",
          route: "/api/account/language",
          scenarioId: "auth-account",
          requestId: otherLanguageInterception.id,
          resourceId: accounts.other.id,
          verificationReference: `${otherReadback.verificationReference}:fi;${ownerReadback.verificationReference}:ru`,
        })
      })
    })

    cy.signIn(accounts.owner)
    cy.get('[data-cy="user-menu"]').click()
    cy.contains("Logout").should("be.visible").click()
    cy.wait<Interception>("@supabaseSignOut", { timeout: 30000 }).then(interception => {
      expect(interception.response?.statusCode).to.equal(204)
    })
    cy.get('[data-cy="user-menu"]').should("not.exist")

    let signedOutLanguageInterception: Interception
    expectRealRejection({ method: "POST", pathname: "/api/account/language", statusCode: 401 })
    cy.window().then(browserWindow => browserWindow.fetch("/api/account/language", {
      method: "POST",
      credentials: "include",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ language: "en" }),
    }).then(response => response.status)).then(status => {
      expect(status, "signed-out profile change is denied").to.equal(401)
      return cy.wait<Interception>("@updateAccountLanguage", { timeout: 30000 }).then(interception => {
        signedOutLanguageInterception = interception
        return cy.task<TRunProfile>("readRunUserProfile", accounts.owner.id)
      })
    }).then(readback => {
      expect(readback?.profile.preferred_language, "signed-out request leaves the saved profile unchanged").to.equal("ru")
      if (!readback) throw new Error("Owner profile readback is missing after signed-out request")
      return recordVerifiedRoute({
        method: "POST",
        route: "/api/account/language",
        scenarioId: "auth-account",
        requestId: signedOutLanguageInterception.id,
        resourceId: accounts.owner.id,
        verificationReference: `${readback.verificationReference}:still-ru-after-401`,
        details: { expectedHttpStatus: 401 },
      })
    })
  })
})
