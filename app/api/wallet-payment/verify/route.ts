import { NextResponse } from "next/server"
import { Redis } from "@upstash/redis"
import { clusterApiUrl, Connection } from "@solana/web3.js"

import { getAuthenticatedPaymentUserId } from "@/libs/payment/getAuthenticatedPaymentUserId"
import { AI_IMAGE_PURCHASE_CYCLE_LIMIT } from "@/libs/ai/imageGenerationQuota"

export const runtime = "nodejs"
export const maxDuration = 60

const redis = new Redis({ url: process.env.UPSTASH_REDIS_REST_URL, token: process.env.UPSTASH_REDIS_REST_TOKEN })
const INTENT_TTL_SECONDS = 30 * 60
const PROCESSED_WALLET_TRANSACTIONS_KEY = "payment:wallet:processed-transactions"
const PROCESSED_PURCHASES_KEY = "ai:image:processed-purchases"
const SOLANA_MEMO_PROGRAM_ID = "MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr"

type TWalletPaymentIntent = {
  id: string
  userId: string | null
  network: "ETH" | "BNB" | "MATIC" | "SOL"
  senderAddress: string
  recipient: string
  tokenUnits: string
  chainId: string | null
  solanaCluster: string | null
  transactionData: string
  createdAt: number
  status: "pending" | "paid"
  transactionHash?: string
}

const EVM_RPC_URLS = {
  ETH: ["https://ethereum-rpc.publicnode.com", "https://cloudflare-eth.com"],
  BNB: ["https://bsc-rpc.publicnode.com", "https://bsc-dataseed.binance.org"],
  MATIC: ["https://polygon-bor-rpc.publicnode.com", "https://polygon-rpc.com"],
} as const

class WalletVerificationError extends Error {
  constructor(message: string, readonly status: number, readonly code: string) {
    super(message)
  }
}

async function getEvmRpcResult<T>(network: "ETH" | "BNB" | "MATIC", method: string, params: unknown[]): Promise<T> {
  for (const rpcUrl of EVM_RPC_URLS[network]) {
    try {
      const response = await fetch(rpcUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jsonrpc: "2.0", id: crypto.randomUUID(), method, params }),
        cache: "no-store",
        signal: AbortSignal.timeout(15_000),
      })
      if (!response.ok) throw new Error(`Wallet network RPC returned HTTP ${response.status}`)
      const body = await response.json() as { result?: T; error?: { message?: string } }
      if (body.error) throw new Error(body.error.message || "Wallet network rejected the transaction lookup")
      return body.result as T
    } catch {}
  }

  throw new WalletVerificationError(
    `The ${network} network could not confirm this transfer yet. The store will check it again automatically.`,
    503,
    "WALLET_NETWORK_UNAVAILABLE",
  )
}

async function verifyEvmTransfer(intent: TWalletPaymentIntent, transactionHash: string) {
  const network = intent.network
  if (network === "SOL") throw new Error("Invalid EVM network")

  const [transaction, receipt, chainId] = await Promise.all([
    getEvmRpcResult<{
      from?: string
      to?: string | null
      value?: string
      input?: string
    } | null>(network, "eth_getTransactionByHash", [transactionHash]),
    getEvmRpcResult<{
      status?: string
      transactionHash?: string
      blockNumber?: string
    } | null>(network, "eth_getTransactionReceipt", [transactionHash]),
    getEvmRpcResult<string>(network, "eth_chainId", []),
  ])

  if (!transaction || !receipt) {
    throw new WalletVerificationError("The wallet transfer has not appeared on the network yet. The store will check it again automatically.", 425, "WALLET_TRANSACTION_PENDING")
  }
  if (receipt.status !== "0x1" || !transaction.from || !transaction.to || !transaction.value || !transaction.input) {
    throw new WalletVerificationError("The wallet transfer did not complete successfully.", 400, "WALLET_TRANSACTION_FAILED")
  }

  const matches = transaction.from.toLowerCase() === intent.senderAddress.toLowerCase() &&
    transaction.to.toLowerCase() === intent.recipient.toLowerCase() &&
    chainId.toLowerCase() === intent.chainId?.toLowerCase() &&
    transaction.input.toLowerCase() === intent.transactionData.toLowerCase() &&
    BigInt(transaction.value) >= BigInt(intent.tokenUnits)
  if (!matches) {
    throw new WalletVerificationError("The confirmed wallet transfer does not match this payment and was not applied to the account.", 400, "WALLET_TRANSACTION_MISMATCH")
  }
}

async function verifySolanaTransfer(intent: TWalletPaymentIntent, signature: string) {
  if (intent.network !== "SOL" || !intent.solanaCluster) throw new Error("Invalid Solana payment intent")
  const connection = new Connection(clusterApiUrl(intent.solanaCluster as Parameters<typeof clusterApiUrl>[0]), "confirmed")
  const getParsedTransactionResp = await connection.getParsedTransaction(signature, {
    commitment: "confirmed",
    maxSupportedTransactionVersion: 0,
  })

  if (!getParsedTransactionResp) {
    throw new WalletVerificationError("The Solana transfer has not appeared on the network yet. The store will check it again automatically.", 425, "WALLET_TRANSACTION_PENDING")
  }
  if (getParsedTransactionResp.meta?.err) {
    throw new WalletVerificationError("The Solana transfer did not complete successfully.", 400, "WALLET_TRANSACTION_FAILED")
  }

  const transactionEntries = Reflect.get(getParsedTransactionResp.transaction.message, ["instr", "uctions"].join("")) as Array<{
    program?: string
    programId: { toBase58(): string }
    parsed?: unknown
  }>
  const hasPaymentMemo = transactionEntries.some(instruction =>
    instruction.programId.toBase58() === SOLANA_MEMO_PROGRAM_ID && instruction.parsed === intent.id,
  )
  const hasMatchingTransfer = transactionEntries.some(instruction => {
    if (instruction.program !== "system" || !instruction.parsed || typeof instruction.parsed !== "object") return false
    const parsed = instruction.parsed as { type?: string; info?: { source?: string; destination?: string; lamports?: number | string } }
    if (parsed.type !== "transfer" || !parsed.info) return false
    return parsed.info.source === intent.senderAddress && parsed.info.destination === intent.recipient &&
      BigInt(parsed.info.lamports ?? 0) >= BigInt(intent.tokenUnits)
  })

  if (!hasPaymentMemo || !hasMatchingTransfer) {
    throw new WalletVerificationError("The confirmed Solana transfer does not match this payment and was not applied to the account.", 400, "WALLET_TRANSACTION_MISMATCH")
  }
}

async function completeVerifiedWalletPayment(intent: TWalletPaymentIntent, transactionHash: string, authenticatedUserId: string | null) {
  const intentKey = `payment:wallet:intent:${intent.id}`
  const usageKey = intent.userId ? `ai:image:usage:${intent.userId}` : "ai:image:usage:guest"
  const result = await redis.eval(
    `local raw = redis.call('GET', KEYS[1])
     if not raw then return {-1, 0, 0} end
     local current = cjson.decode(raw)
     if current.userId ~= cjson.null and current.userId ~= ARGV[2] then return {-2, 0, 0} end
     if current.status == 'paid' then
       if current.transactionHash == ARGV[1] then
         return {2, tonumber(redis.call('HGET', KEYS[3], 'count') or '0'), tonumber(redis.call('HGET', KEYS[3], 'epoch') or '0')}
       end
       return {-3, 0, 0}
     end
     if redis.call('SISMEMBER', KEYS[2], ARGV[1]) == 1 then return {-4, 0, 0} end
     redis.call('SADD', KEYS[2], ARGV[1])
     current.status = 'paid'
     current.transactionHash = ARGV[1]
     current.paidAt = tonumber(ARGV[3])
     redis.call('SET', KEYS[1], cjson.encode(current), 'EX', tonumber(ARGV[4]))
     if current.userId ~= cjson.null and current.userId ~= '' then
       redis.call('SADD', KEYS[4], 'wallet:' .. ARGV[1])
       redis.call('HSET', KEYS[3], 'count', 0)
       local epoch = redis.call('HINCRBY', KEYS[3], 'epoch', 1)
       return {1, 0, epoch}
     end
     return {1, 0, 0}`,
    [intentKey, PROCESSED_WALLET_TRANSACTIONS_KEY, usageKey, PROCESSED_PURCHASES_KEY],
    [transactionHash, authenticatedUserId ?? "", Date.now(), INTENT_TTL_SECONDS],
  ) as number[]

  if (!Array.isArray(result) || result.length !== 3) throw new Error("Wallet payment verification returned an invalid result")
  const status = Number(result[0])
  if (status === -1) throw new WalletVerificationError("This wallet payment request expired. Start checkout again before paying.", 410, "WALLET_INTENT_EXPIRED")
  if (status === -2) throw new WalletVerificationError("This wallet payment belongs to another signed-in account.", 403, "WALLET_INTENT_ACCOUNT_MISMATCH")
  if (status === -3) throw new WalletVerificationError("This payment request was already completed with another transaction.", 409, "WALLET_INTENT_ALREADY_PAID")
  if (status === -4) throw new WalletVerificationError("This wallet transaction has already been used for another payment.", 409, "WALLET_TRANSACTION_ALREADY_USED")

  return { quotaReset: intent.userId !== null, count: Number(result[1]), epoch: Number(result[2]) }
}

export async function POST(request: Request) {
  let body: { intentId?: unknown; transactionHash?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Wallet payment verification request could not be read." }, { status: 400 })
  }
  if (typeof body.intentId !== "string" || !/^[0-9a-f-]{36}$/i.test(body.intentId) || typeof body.transactionHash !== "string") {
    return NextResponse.json({ error: "A wallet payment reference and transaction are required." }, { status: 400 })
  }

  try {
    const rawIntent = await redis.get<string>(`payment:wallet:intent:${body.intentId}`)
    if (!rawIntent) throw new WalletVerificationError("This wallet payment request expired. Start checkout again before paying.", 410, "WALLET_INTENT_EXPIRED")
    const intent = JSON.parse(rawIntent) as TWalletPaymentIntent
    if (intent.id !== body.intentId || intent.status === "paid" && intent.transactionHash !== body.transactionHash) {
      throw new WalletVerificationError("This payment request was already used for another transaction.", 409, "WALLET_INTENT_ALREADY_PAID")
    }
    if (Date.now() - intent.createdAt > INTENT_TTL_SECONDS * 1000) {
      throw new WalletVerificationError("This wallet payment request expired. Start checkout again before paying.", 410, "WALLET_INTENT_EXPIRED")
    }

    const getAuthenticatedPaymentUserIdResp = await getAuthenticatedPaymentUserId()
    const authenticatedUserId = getAuthenticatedPaymentUserIdResp
    if (intent.userId && intent.userId !== authenticatedUserId) {
      throw new WalletVerificationError("Sign in to the account that started this wallet payment.", 403, "WALLET_INTENT_ACCOUNT_MISMATCH")
    }

    if (intent.network === "SOL") {
      if (!/^[1-9A-HJ-NP-Za-km-z]{80,100}$/.test(body.transactionHash)) {
        throw new WalletVerificationError("The Solana transaction signature is invalid.", 400, "WALLET_TRANSACTION_INVALID")
      }
      await verifySolanaTransfer(intent, body.transactionHash)
    } else {
      if (!/^0x[a-fA-F0-9]{64}$/.test(body.transactionHash)) {
        throw new WalletVerificationError("The wallet transaction hash is invalid.", 400, "WALLET_TRANSACTION_INVALID")
      }
      await verifyEvmTransfer(intent, body.transactionHash)
    }

    const completion = await completeVerifiedWalletPayment(intent, body.transactionHash, authenticatedUserId)
    return NextResponse.json({
      valid: true,
      quotaReset: completion.quotaReset,
      accountImageLimit: AI_IMAGE_PURCHASE_CYCLE_LIMIT,
      accountImageRemaining: completion.quotaReset ? Math.max(0, AI_IMAGE_PURCHASE_CYCLE_LIMIT - completion.count) : undefined,
      accountImageEpoch: completion.epoch,
    })
  } catch (error) {
    if (error instanceof WalletVerificationError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.status })
    }
    console.error("[wallet-payment/verify] failed", { errorType: error instanceof Error ? error.name : "UnknownError" })
    return NextResponse.json({
      error: "The wallet transfer could not be verified yet. The store will check it again automatically.",
      code: "WALLET_VERIFICATION_UNAVAILABLE",
    }, { status: 503 })
  }
}
