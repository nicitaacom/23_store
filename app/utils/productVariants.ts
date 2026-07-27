import { TProductTranslations } from "@/ts/product/TProductDB"
import { TProductVariant } from "@/ts/product/TProductVariant"
import {
  TMockupRect,
  TPersonalizationConfig,
  TPrintArea,
  TProductPersonalization,
} from "@/ts/product/TPersonalization"
import { normalizeProductImageUrls, normalizeProductTranslations } from "./product"

// price and quantity are optional on the raw row — legacy variants predate both fields
type TProductVariantCandidate = Omit<TProductVariant, "price" | "quantity"> & {
  price?: number
  quantity?: number
}

function isProductVariant(value: unknown): value is TProductVariantCandidate {
  if (!value || typeof value !== "object") return false

  const candidate = value as Record<string, unknown>
  return (
    typeof candidate.id === "string" &&
    typeof candidate.label === "string" &&
    typeof candidate.image_url === "string" &&
    (candidate.price === undefined ||
      (typeof candidate.price === "number" && Number.isFinite(candidate.price) && candidate.price > 0))
  )
}

// Coerce a raw quantity to a non-negative integer; legacy rows with no quantity
// inherit the product's on_stock so they aren't wrongly shown as sold out.
function resolveVariantQuantity(rawQuantity: unknown, fallbackQuantity: number) {
  if (typeof rawQuantity === "number" && Number.isFinite(rawQuantity) && rawQuantity >= 0) return Math.floor(rawQuantity)
  return Math.max(0, Math.floor(fallbackQuantity))
}

export function normalizeProductVariants(value: unknown, fallbackPrice = 0, fallbackQuantity = 0): TProductVariant[] | null {
  if (!Array.isArray(value)) return null

  const variants = value
    .filter(isProductVariant)
    .map(variant => ({
      ...variant,
      price:
        typeof variant.price === "number" && Number.isFinite(variant.price) && variant.price > 0 ? variant.price : fallbackPrice,
      quantity: resolveVariantQuantity(variant.quantity, fallbackQuantity),
    }))
    .filter(variant => variant.price > 0)

  return variants.length ? variants : null
}

function isPrintArea(value: unknown): value is TPrintArea {
  const candidate = value as Record<string, unknown> | null
  return (
    !!candidate &&
    typeof candidate.widthMm === "number" &&
    typeof candidate.heightMm === "number" &&
    candidate.widthMm > 0 &&
    candidate.heightMm > 0
  )
}

function isMockupRect(value: unknown): value is TMockupRect {
  const candidate = value as Record<string, unknown> | null
  return (
    !!candidate &&
    ["leftPct", "topPct", "widthPct", "heightPct"].every(key => typeof candidate[key] === "number") &&
    (candidate.widthPct as number) > 0 &&
    (candidate.heightPct as number) > 0
  )
}

function normalizePersonalizationConfig(value: unknown): TPersonalizationConfig | null {
  const candidate = value as Record<string, unknown> | null
  if (!candidate || typeof candidate.mockupUrl !== "string" || !candidate.mockupUrl) return null
  if (!isPrintArea(candidate.printArea) || !isMockupRect(candidate.mockupRect)) return null

  return { mockupUrl: candidate.mockupUrl, printArea: candidate.printArea, mockupRect: candidate.mockupRect }
}

// A half-written config would render a preview that lies about the print size, so a config without a
// mockup, a print area in mm and a rectangle is dropped to null - the product gets no Personalize button.
export function normalizePersonalization(value: unknown): TProductPersonalization | null {
  const candidate = value as Record<string, unknown> | null
  if (!candidate || candidate.isEnabled !== true) return null

  const defaultConfig = normalizePersonalizationConfig(candidate.defaultConfig)
  const rawVariantConfigs = (candidate.variantConfigs as Record<string, unknown> | undefined) ?? {}
  const variantConfigs: Record<string, TPersonalizationConfig> = {}

  for (const [variantId, rawConfig] of Object.entries(rawVariantConfigs)) {
    const config = normalizePersonalizationConfig(rawConfig)
    if (config) variantConfigs[variantId] = config
  }

  if (!defaultConfig && !Object.keys(variantConfigs).length) return null

  return { isEnabled: true, defaultConfig, variantConfigs }
}

export function normalizeProduct<
  T extends { img_url?: unknown; variants?: unknown; translations?: unknown; personalization?: unknown },
>(
  product: T,
): Omit<T, "img_url" | "variants" | "translations" | "personalization"> & {
  img_url: string[]
  variants: TProductVariant[] | null
  translations: TProductTranslations
  personalization: TProductPersonalization | null
} {
  const normalizedPrice =
    typeof (product as { price?: unknown }).price === "number" ? ((product as unknown as { price: number }).price ?? 0) : 0
  const normalizedOnStock =
    typeof (product as { on_stock?: unknown }).on_stock === "number"
      ? ((product as unknown as { on_stock: number }).on_stock ?? 0)
      : 0

  return {
    ...product,
    img_url: normalizeProductImageUrls(product.img_url),
    variants: normalizeProductVariants(product.variants, normalizedPrice, normalizedOnStock),
    translations: normalizeProductTranslations(product.translations),
    personalization: normalizePersonalization(product.personalization),
  }
}

export function normalizeProducts<
  T extends { variants?: unknown; translations?: unknown; personalization?: unknown },
>(products: T[]) {
  return products.map(product => normalizeProduct(product))
}
