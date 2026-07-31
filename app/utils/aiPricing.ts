import { TProductVariant } from "@/ts/product/TProductVariant"
import {
  AI_PRICE_BASELINE_CHANGE_LIMIT,
  AI_PRICE_MAX_REASONING_LENGTH,
} from "@/constants/aiPricing"

export type TAIPriceResearchInput = {
  id: string
  name: string
  price: number
}

export type TAIPriceResearchOutput = TAIPriceResearchInput & {
  reasoning: string
}

export function roundPrice(price: number) {
  return Math.round((price + Number.EPSILON) * 100) / 100
}

export function getAIPriceBand(baseline: number) {
  return {
    minimum: roundPrice(baseline * (1 - AI_PRICE_BASELINE_CHANGE_LIMIT)),
    maximum: roundPrice(baseline * (1 + AI_PRICE_BASELINE_CHANGE_LIMIT)),
  }
}

export function clampAIPrice(price: number, baseline: number) {
  const band = getAIPriceBand(baseline)
  return Math.min(Math.max(roundPrice(price), band.minimum), band.maximum)
}

export function adjustVariantPrices(variants: TProductVariant[] | null, currentPrice: number, proposedPrice: number) {
  if (!variants?.length) return null
  const ratio = proposedPrice / currentPrice

  return variants.map(variant => ({
    ...variant,
    price: roundPrice(variant.price * ratio),
  }))
}

export function validateAIPriceResearch(value: unknown, inputs: TAIPriceResearchInput[]) {
  if (!value || typeof value !== "object" || !Array.isArray((value as { products?: unknown }).products)) {
    throw new Error("AI price research returned an invalid products object")
  }

  const products = (value as { products: unknown[] }).products
  if (products.length !== inputs.length) {
    throw new Error(`AI price research returned ${products.length} products; expected ${inputs.length}`)
  }

  const inputById = new Map(inputs.map(input => [input.id, input]))
  const seenIds = new Set<string>()

  return products.map(productValue => {
    if (!productValue || typeof productValue !== "object") {
      throw new Error("AI price research returned an invalid product")
    }

    const product = productValue as Partial<TAIPriceResearchOutput>
    const input = typeof product.id === "string" ? inputById.get(product.id) : undefined

    if (!input || seenIds.has(input.id)) {
      throw new Error(`AI price research returned an unknown or duplicate product id: ${String(product.id)}`)
    }
    if (product.name !== input.name) {
      throw new Error(`AI price research changed the product name for ${input.id}`)
    }
    if (typeof product.price !== "number" || !Number.isFinite(product.price) || product.price <= 0) {
      throw new Error(`AI price research returned an invalid price for ${input.id}`)
    }

    const reasoning = typeof product.reasoning === "string" ? product.reasoning.trim() : ""
    if (!reasoning || reasoning.length > AI_PRICE_MAX_REASONING_LENGTH) {
      throw new Error(`AI price research reasoning for ${input.id} must be 1–${AI_PRICE_MAX_REASONING_LENGTH} characters`)
    }

    seenIds.add(input.id)
    return {
      id: input.id,
      name: input.name,
      price: roundPrice(product.price),
      reasoning,
    } satisfies TAIPriceResearchOutput
  })
}

export function getUTCWeekKey(date = new Date()) {
  const monday = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
  const daysSinceMonday = (monday.getUTCDay() + 6) % 7
  monday.setUTCDate(monday.getUTCDate() - daysSinceMonday)
  return monday.toISOString().slice(0, 10)
}
