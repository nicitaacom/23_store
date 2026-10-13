import type { Interception } from "cypress/types/net-stubbing"

import { recordResource, recordVerifiedRoute, reservePaidScenarioOperation, settlePaidScenarioOperation } from "./support"

type TRunAccount = { id: string; email: string; password: string; role: string }
type TRunAccounts = Record<"owner" | "other" | "support" | "admin", TRunAccount>
type TMemorySnapshot = {
  historyKey: string
  history: Array<{ role: "user" | "assistant"; text: string }>
  vectorRecords: Array<{ id: string; role: "user" | "assistant"; text: string }>
  verificationReference: string
}
type TChatResponse = {
  openai?: { choices?: Array<{ message?: { content?: string | null; function_call?: { name?: string } | null } }> }
  memory?: string
  error?: string
  reply?: string
}
type TMemoryResponse = { memory?: string; error?: string }

let routeSequence = 0

function browserRequest<TBody>(url: string, body: Record<string, unknown>): Cypress.Chainable<{
  statusCode: number
  body: TBody
  interception: Interception
}> {
  const alias = `plan25AIMemoryRoute${++routeSequence}`
  cy.intercept("POST", url).as(alias)
  return cy.window().then(browserWindow => browserWindow.fetch(url, {
    method: "POST",
    credentials: "include",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  }).then(async response => ({ statusCode: response.status, body: await response.json() as TBody })))
    .then(result => cy.wait<Interception>(`@${alias}`).then(interception => ({ ...result, interception })))
}

function runKey(name: string) {
  return `${String(Cypress.env("E2E_RUN_ID"))}:ai-chat-memory:${name}`
}

describe("monthly real-service sales chat and persistent memory", function () {
  this.timeout(360000)
  let accounts: TRunAccounts
  let memoryOwnerWasEmpty = false
  let paidOperations: Array<{ operationKey: string; reserved: boolean; attempted: boolean; settled: boolean }> = []

  before(() => {
    cy.task<TRunAccounts>("prepareRunAccounts").then(runAccounts => {
      accounts = runAccounts
    })
  })

  beforeEach(() => {
    memoryOwnerWasEmpty = false
    paidOperations = []
    cy.signIn(accounts.owner)
    cy.visit("/")
  })

  afterEach(() => {
    let cleanupChain = cy.then(() => ({ cleanupComplete: true as const }))
    if (memoryOwnerWasEmpty) {
      cleanupChain = cleanupChain.then(() => cy.task<TMemorySnapshot>("captureRunAiMemory", accounts.owner.id, { log: false })
        .then(snapshot => {
          const expectedRedisKey = `ai:history:${accounts.owner.id}`
          expect(snapshot.historyKey).to.equal(expectedRedisKey)
          expect(snapshot.vectorRecords.every(record => /^(user|assistant):\d+:[0-9a-f-]+$/i.test(record.id))).to.equal(true)
          return { cleanupComplete: true as const }
        }))
    }

    for (const operation of paidOperations) {
      if (!operation.reserved || operation.settled) continue
      cleanupChain = cleanupChain.then(() => settlePaidScenarioOperation({
        operationKey: operation.operationKey,
        status: operation.attempted ? "unknown" : "failed",
        details: {
          scenarioId: "ai-chat-memory",
          reason: operation.attempted
            ? "Provider request started but independent verification did not finish"
            : "The provider request did not start",
        },
      }).then(() => {
        operation.settled = true
        return { cleanupComplete: true as const }
      }))
    }
    return cleanupChain
  })

  it("answers through the real chat route and reads back both Redis history and Pinecone vectors", () => {
    const runSuffix = String(Cypress.env("E2E_RUN_ID")).replace(/[^a-z0-9-]/gi, "-").slice(-18)
    const prompt = `Remember E2E-${runSuffix}: blue ceramic mugs`
    const memoryPrompt = `E2E-${runSuffix} also likes teal bowls`
    const memoryReply = `Saved the E2E-${runSuffix} preference for teal bowls.`
    const salesOperation = {
      operationKey: runKey("sales-chat"),
      provider: "openai",
      capability: "sales assistant chat completion",
      estimateName: "sales_chat",
      paidCallCount: 1,
    }
    const memoryOperation = {
      operationKey: runKey("memory-and-embeddings"),
      provider: "openai",
      capability: "sales assistant embeddings and memory persistence",
      estimateName: "memory_and_embeddings",
      paidCallCount: 3,
    }
    const salesState = { operationKey: salesOperation.operationKey, reserved: false, attempted: false, settled: false }
    const memoryState = { operationKey: memoryOperation.operationKey, reserved: false, attempted: false, settled: false }

    reservePaidScenarioOperation(salesOperation)
      .then(salesReservation => {
        expect(salesReservation.allowed, "budget reserved before the chat provider request").to.equal(true)
        salesState.reserved = true
        paidOperations.push(salesState)
        return reservePaidScenarioOperation(memoryOperation)
      })
      .then(memoryReservation => {
        expect(memoryReservation.allowed, "budget reserved before embedding requests").to.equal(true)
        memoryState.reserved = true
        paidOperations.push(memoryState)
        return cy.task<TMemorySnapshot>("readRunAiMemory", accounts.owner.id, { log: false })
      })
      .then(initial => {
        expect(initial.history, "a fresh run-owned account has no prior conversation").to.have.length(0)
        expect(initial.vectorRecords, "a fresh run-owned namespace has no prior vectors").to.have.length(0)
        memoryOwnerWasEmpty = true
        return recordResource("redis_key", initial.historyKey, accounts.owner.id, {
          provider: "upstash",
          purpose: "sales-assistant-history",
        })
      })
      .then(() => {
        salesState.attempted = true
        return browserRequest<TChatResponse>("/api/ai/sales-assistant", {
          promptValue: prompt,
          memory: "",
          conversationHistory: [],
        })
      })
      .then(chatResult => {
        expect(chatResult.statusCode, "real sales assistant route response").to.equal(200)
        expect(chatResult.body.error).to.equal(undefined)
        expect(chatResult.body.reply).to.equal(undefined)
        const assistantReply = chatResult.body.openai?.choices?.[0]?.message?.content?.trim() ?? ""
        expect(assistantReply.length, "real nonempty assistant reply").to.be.greaterThan(0)
        expect(chatResult.body.openai?.choices?.[0]?.message?.function_call?.name).to.equal(undefined)
        expect(typeof chatResult.body.memory).to.equal("string")
        return cy.task<TMemorySnapshot>("captureRunAiMemory", accounts.owner.id, { log: false })
          .then(snapshot => ({ chatResult, assistantReply, snapshot }))
      })
      .then(({ chatResult, assistantReply, snapshot }) => {
        const userTurn = snapshot.history.find(message => message.role === "user" && message.text === prompt)
        const savedAssistantTurn = snapshot.history.find(message => message.role === "assistant" && message.text === assistantReply)
        expect(Boolean(userTurn), "exact user turn was independently read from Redis").to.equal(true)
        expect(Boolean(savedAssistantTurn), "exact assistant turn was independently read from Redis").to.equal(true)
        const matchingVectors = snapshot.vectorRecords.filter(record => record.text === prompt || record.text === assistantReply)
        expect(matchingVectors, "user and assistant embeddings were independently fetched from Pinecone").to.have.length(2)
        expect(matchingVectors.map(record => record.role)).to.have.members(["user", "assistant"])
        return recordVerifiedRoute({
          method: "POST",
          route: "/api/ai/sales-assistant",
          scenarioId: "ai-chat-memory",
          requestId: chatResult.interception.id,
          resourceId: accounts.owner.id,
          verificationReference: `${snapshot.verificationReference};redis:user-and-assistant-turns;pinecone:user-and-assistant-vectors`,
        }).then(() => settlePaidScenarioOperation({
          operationKey: salesOperation.operationKey,
          status: "completed",
          providerResourceId: chatResult.interception.id,
          details: { scenarioId: "ai-chat-memory", outcome: "real-assistant-reply-read-back" },
        })).then(() => {
          salesState.settled = true
          memoryState.attempted = true
          return browserRequest<TMemoryResponse>("/api/ai/sales-assistant/memory", {
            userPrompt: memoryPrompt,
            assistantReply: memoryReply,
            memory: chatResult.body.memory ?? "",
          })
        })
      })
      .then(memoryResult => {
        expect(memoryResult.statusCode, "real persistent-memory route response").to.equal(200)
        expect(memoryResult.body.error).to.equal(undefined)
        expect(typeof memoryResult.body.memory).to.equal("string")
        return cy.task<TMemorySnapshot>("captureRunAiMemory", accounts.owner.id, { log: false })
          .then(snapshot => ({ memoryResult, snapshot }))
      })
      .then(({ memoryResult, snapshot }) => {
        expect(snapshot.history.some(message => message.role === "user" && message.text === memoryPrompt)).to.equal(true)
        expect(snapshot.history.some(message => message.role === "assistant" && message.text === memoryReply)).to.equal(true)
        expect(snapshot.vectorRecords.some(record => record.role === "user" && record.text === memoryPrompt)).to.equal(true)
        expect(snapshot.vectorRecords.some(record => record.role === "assistant" && record.text === memoryReply)).to.equal(true)
        return recordVerifiedRoute({
          method: "POST",
          route: "/api/ai/sales-assistant/memory",
          scenarioId: "ai-chat-memory",
          requestId: memoryResult.interception.id,
          resourceId: accounts.owner.id,
          verificationReference: `${snapshot.verificationReference};second-user-and-assistant-turns-read-back`,
        }).then(() => settlePaidScenarioOperation({
          operationKey: memoryOperation.operationKey,
          status: "completed",
          providerResourceId: memoryResult.interception.id,
          details: {
            scenarioId: "ai-chat-memory",
            embeddingRequests: 3,
            verifiedRedisMessages: snapshot.history.length,
            verifiedPineconeVectors: snapshot.vectorRecords.length,
          },
        }))
      })
      .then(() => {
        salesState.settled = true
        memoryState.settled = true
      })
  })
})
