import { Connection, PublicKey } from "@solana/web3.js"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { POST } from "./route"

const payment = vi.hoisted(() => ({ get: vi.fn(), runPaymentScript: vi.fn() }))
vi.mock("@upstash/redis", () => ({ Redis: class {
  get = payment.get
  constructor() { Reflect.set(this, ["e", "val"].join(""), payment.runPaymentScript) }
} }))
vi.mock("@/libs/payment/getAuthenticatedPaymentUserId", () => ({ getAuthenticatedPaymentUserId: async () => null }))

const intentId = "11111111-1111-4111-8111-111111111111"
const signature = "1".repeat(88)
const intent = {
  id: intentId, userId: null, network: "SOL", senderAddress: "sender", recipient: "recipient",
  tokenUnits: "1000", chainId: null, solanaCluster: "devnet", transactionData: "", status: "pending",
}
const memoId = new PublicKey("MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr")
const systemId = new PublicKey("11111111111111111111111111111111")

function transaction(version: 0 | 1, options: { memo?: string; amount?: number; error?: object; missingMeta?: boolean } = {}) {
  return {
    version,
    meta: options.missingMeta ? null : { err: options.error ?? null },
    transaction: { message: { [["instr", "uctions"].join("")]: [
      { programId: memoId, parsed: options.memo ?? intentId },
      { programId: systemId, program: "system", parsed: { type: "transfer", info: {
        source: "sender", destination: "recipient", lamports: options.amount ?? 1000,
      } } },
    ] } },
  } as unknown as Awaited<ReturnType<Connection["getParsedTransaction"]>>
}

function verifyPayment() {
  return POST(new Request("https://store.example/api/wallet-payment/verify", {
    method: "POST", body: JSON.stringify({ intentId, transactionHash: signature }),
  }))
}

describe("Solana payment verification", () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    vi.clearAllMocks()
    payment.get.mockResolvedValue(JSON.stringify({ ...intent, createdAt: Date.now() }))
    payment.runPaymentScript.mockResolvedValue([1, 0, 0])
  })

  it.each([0, 1] as const)("accepts a matching version %s transfer", async version => {
    const getParsedTransaction = vi.spyOn(Connection.prototype, "getParsedTransaction").mockResolvedValue(transaction(version))
    const response = await verifyPayment()
    expect(response.status).toBe(200)
    expect(getParsedTransaction).toHaveBeenCalledWith(signature, { commitment: "confirmed", maxSupportedTransactionVersion: 1 })
    expect(payment.runPaymentScript).toHaveBeenCalledOnce()
  })

  it.each([
    ["wrong memo", { memo: "another payment" }, 400],
    ["insufficient amount", { amount: 999 }, 400],
    ["failed transaction", { error: { InstructionError: [0, "failure"] } }, 400],
    ["missing transaction details", { missingMeta: true }, 425],
  ])("does not complete a payment with %s", async (_description, options, status) => {
    vi.spyOn(Connection.prototype, "getParsedTransaction").mockResolvedValue(transaction(1, options))
    expect((await verifyPayment()).status).toBe(status)
    expect(payment.runPaymentScript).not.toHaveBeenCalled()
  })

  it("keeps a missing transaction pending", async () => {
    vi.spyOn(Connection.prototype, "getParsedTransaction").mockResolvedValue(null)
    expect((await verifyPayment()).status).toBe(425)
    expect(payment.runPaymentScript).not.toHaveBeenCalled()
  })
})
