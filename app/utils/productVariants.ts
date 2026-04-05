import { ProductTranslations } from "@/ts/product/TProductDB"
import { TProductVariant } from "@/ts/product/TProductVariant"
import { normalizeProductImageUrls, normalizeProductTranslations } from "./product"

type TProductVariantCandidate = Omit<TProductVariant, "price"> & {
  price?: number
}

function isProductVariant(value: unknown): value is TProductVariantCandidate {
  if (!value || typeof value !== "object") return false

  const candidate = value as Record<string, unknown>
  return (
    typeof candidate.id === "string" &&
    typeof candidate.label === "string" &&
    typeof candidate.image_url === "string" &&
    (candidate.price === undefined || (typeof candidate.price === "number" && Number.isFinite(candidate.price) && candidate.price > 0))
  )
}

export function normalizeProductVariants(value: unknown, fallbackPrice?: number): TProductVariant[] | null {
  if (!Array.isArray(value)) return null

  const variants = value
    .filter(isProductVariant)
    .map(variant => ({
      ...variant,
      price: typeof variant.price === "number" && Number.isFinite(variant.price) && variant.price > 0 ? variant.price : fallbackPrice || 0,
    }))
    .filter(variant => variant.price > 0)

  return variants.length ? variants : null
}

export function normalizeProduct<T extends { img_url?: unknown; variants?: unknown; translations?: unknown }>(
  product: T,
): Omit<T, "img_url" | "variants" | "translations"> & {
  img_url: string[]
  variants: TProductVariant[] | null
  translations: ProductTranslations
} {
  const normalizedPrice = typeof (product as { price?: unknown }).price === "number" ? ((product as unknown as { price: number }).price ?? 0) : 0

  return {
    ...product,
    img_url: normalizeProductImageUrls(product.img_url),
    variants: normalizeProductVariants(product.variants, normalizedPrice),
    translations: normalizeProductTranslations(product.translations),
  }
}

export function normalizeProducts<T extends { variants?: unknown; translations?: unknown }>(products: T[]) {
  return products.map(product => normalizeProduct(product))
}
