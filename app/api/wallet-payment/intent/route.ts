import { NextResponse } from "next/server"
import { Redis } from "@upstash/redis"

import { TProductVariant } from "@/ts/product/TProductVariant"
import { getAuthenticatedPaymentUserId } from "@/libs/payment/getAuthenticatedPaymentUserId"
import { supabaseAdmin } from "@/libs/supabase/supabaseAdmin"

export const runtime = "nodejs"

const redis = new Redis({ url: process.env.UPSTASH_REDIS_REST_URL, token: process.env.UPSTASH_REDIS_REST_TOKEN })
const INTENT_TTL_SECONDS = 30 * 60

type TNetwork = "ETH" | "BNB" | "MATIC" | "SOL"
type TCartItem = { productId: string; variantId?: string | null; quantity: number }

const EVM_NETWORKS = {
  ETH: { chainId: "0x1", decimals: 18, recipient: () => process.env.NEXT_PUBLIC_METAMASK_ADRESS_ETH },
  BNB: { chainId: "0x38", decimals: 18, recipient: () => process.env.NEXT_PUBLIC_METAMASK_ADRESS_BNB },
  MATIC: { chainId: "0x89", decimals: 18, recipient: () => process.env.NEXT_PUBLIC_METAMASK_ADRESS_MATIC },
} as const

function isNetwork(value: unknown): value is TNetwork {
  return value === "ETH" || value === "BNB" || value === "MATIC" || value === "SOL"
}

function toBaseUnits(value: number, decimals: number) {
  if (!Number.isFinite(value) || value <= 0) throw new Error("The market quote was not a positive number")

  const [coefficient, exponentString] = value.toString().toLowerCase().split("e")
  const exponent = Number(exponentString ?? 0)
  const [whole, fractional = ""] = coefficient.split(".")
  let digits = `${whole}${fractional}`.replace(/^0+(?=\d)/, "")
  let decimalPlaces = fractional.length - exponent
  if (decimalPlaces < 0) {
    digits += "0".repeat(-decimalPlaces)
    decimalPlaces = 0
  }

  const integer = BigInt(digits || "0")
  const precision = BigInt(decimals)
  const scale = BigInt(decimalPlaces)
  if (precision >= scale) return integer * 10n ** (precision - scale)

  const divisor = 10n ** (scale - precision)
  const quotient = integer / divisor
  const remainder = integer % divisor
  return quotient + (remainder * 2n >= divisor ? 1n : 0n)
}

async function getNativeTokenQuote(totalUsd: number, symbol: TNetwork) {
  const apiKey = process.env.NEXT_COINMARKETCAP_SECRET
  if (!apiKey) throw new Error("CoinMarketCap is not configured")

  const url = new URL("https://pro-api.coinmarketcap.com/v2/tools/price-conversion")
  url.searchParams.set("amount", String(totalUsd))
  url.searchParams.set("symbol", "USD")
  url.searchParams.set("convert", symbol)

  const timeouts = [15_000, 45_000] as const
  let lastError: unknown
  for (const [index, timeout] of timeouts.entries()) {
    try {
      const response = await fetch(url, {
        headers: { "X-CMC_PRO_API_KEY": apiKey, Accept: "application/json" },
        cache: "no-store",
        signal: AbortSignal.timeout(timeout),
      })
      if (response.ok) {
        const body = await response.json() as { data?: Array<{ quote?: Record<string, { price?: number }> }> }
        const price = body.data?.[0]?.quote?.[symbol]?.price
        if (typeof price === "number" && Number.isFinite(price) && price > 0) return price
        throw new Error("CoinMarketCap returned no usable conversion quote")
      }

      const retryable = response.status === 408 || response.status === 429 || response.status >= 500
      const responseError = new Error(`CoinMarketCap quote failed with HTTP ${response.status}`)
      if (!retryable || index === timeouts.length - 1) throw responseError
      lastError = responseError
      await new Promise(resolve => setTimeout(resolve, 500))
      continue
    } catch (error) {
      lastError = error
      const retryable = error instanceof TypeError ||
        error instanceof Error && (/Timeout|Abort/i.test(error.name) || /HTTP (408|429|5\d\d)/.test(error.message))
      if (!retryable || index === timeouts.length - 1) break
    }
    await new Promise(resolve => setTimeout(resolve, 500))
  }

  throw lastError instanceof Error ? lastError : new Error("CoinMarketCap quote failed")
}

async function getAuthoritativeCartTotal(items: TCartItem[]) {
  const ids = [...new Set(items.map(item => item.productId))]
  // eslint-disable-next-line local-rules/use-rls-supabase-client -- Guest checkout reads authoritative public product prices and variants; client prices are never accepted.
  const { data, error } = await supabaseAdmin.from("23_products").select("id,price,variants").in("id", ids)
  if (error) throw error

  const products = new Map((data ?? []).map(product => [product.id, product]))
  if (products.size !== ids.length) throw new Error("A cart product is no longer available")

  return items.reduce((total, item) => {
    const product = products.get(item.productId)
    if (!product) throw new Error("A cart product is no longer available")
    const variants = Array.isArray(product.variants) ? product.variants as TProductVariant[] : []
    const variant = item.variantId ? variants.find(candidate => candidate.id === item.variantId) : undefined
    if (item.variantId && !variant) throw new Error("A selected product option is no longer available")
    if (variants.length > 0 && !variant) throw new Error("Choose a product option before paying")
    const price = Number(variant?.price ?? product.price)
    if (!Number.isFinite(price) || price <= 0) throw new Error("A cart product has an invalid saved price")
    return total + price * item.quantity
  }, 0)
}

export async function POST(request: Request) {
  let body: { network?: unknown; senderAddress?: unknown; products?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Wallet payment details could not be read." }, { status: 400 })
  }

  if (!isNetwork(body.network) || typeof body.senderAddress !== "string" || !Array.isArray(body.products) ||
    body.products.length === 0 || body.products.length > 100) {
    return NextResponse.json({ error: "Choose a supported wallet and review the items in your cart." }, { status: 400 })
  }

  const network = body.network
  const senderAddress = body.senderAddress.trim()
  const isSolana = network === "SOL"
  if (isSolana ? !/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(senderAddress) : !/^0x[a-fA-F0-9]{40}$/.test(senderAddress)) {
    return NextResponse.json({ error: "The connected wallet address is invalid." }, { status: 400 })
  }

  const products = body.products as TCartItem[]
  if (products.some(item => !item || typeof item.productId !== "string" || !item.productId.trim() ||
    (item.variantId !== undefined && item.variantId !== null && typeof item.variantId !== "string") ||
    !Number.isSafeInteger(item.quantity) || item.quantity < 1 || item.quantity > 999)) {
    return NextResponse.json({ error: "The cart contains invalid product details." }, { status: 400 })
  }

  try {
    const getAuthenticatedPaymentUserIdResp = await getAuthenticatedPaymentUserId()
    const getAuthoritativeCartTotalResp = await getAuthoritativeCartTotal(products)
    const getNativeTokenQuoteResp = await getNativeTokenQuote(getAuthoritativeCartTotalResp, network)
    const decimals = network === "SOL" ? 9 : EVM_NETWORKS[network].decimals
    const tokenUnits = toBaseUnits(getNativeTokenQuoteResp, decimals)
    const intentId = crypto.randomUUID()
    const recipient = network === "SOL" ? process.env.NEXT_PUBLIC_SOLANA_ADDRESS : EVM_NETWORKS[network].recipient()

    if (!recipient || (isSolana
      ? !/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(recipient)
      : !/^0x[a-fA-F0-9]{40}$/.test(recipient))) {
      return NextResponse.json({ error: "The selected wallet payment method is not configured correctly." }, { status: 503 })
    }

    const intent = {
      id: intentId,
      userId: getAuthenticatedPaymentUserIdResp,
      network,
      senderAddress,
      recipient,
      totalUsd: getAuthoritativeCartTotalResp,
      tokenUnits: tokenUnits.toString(),
      chainId: isSolana ? null : EVM_NETWORKS[network].chainId,
      solanaCluster: isSolana ? process.env.NEXT_PUBLIC_SOLANA_CLUSTER || "devnet" : null,
      transactionData: `0x${Buffer.from(intentId, "utf8").toString("hex")}`,
      createdAt: Date.now(),
      status: "pending" as const,
    }

    const stored = await redis.set(`payment:wallet:intent:${intentId}`, JSON.stringify(intent), {
      ex: INTENT_TTL_SECONDS,
      nx: true,
    })
    if (!stored) throw new Error("Wallet payment intent could not be saved")

    return NextResponse.json({
      intentId,
      network,
      recipient,
      tokenUnits: tokenUnits.toString(),
      transactionData: intent.transactionData,
      chainId: intent.chainId,
      solanaCluster: intent.solanaCluster,
    })
  } catch (error) {
    console.error("[wallet-payment/intent] failed", { errorType: error instanceof Error ? error.name : "UnknownError" })
    return NextResponse.json({
      error: "The wallet payment amount could not be verified. No transfer was started. Contact store support if this continues.",
    }, { status: 503 })
  }
}
