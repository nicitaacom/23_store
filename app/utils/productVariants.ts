import { ProductTranslations } from "@/ts/product/TProductDB"
import { TProductVariant } from "@/ts/product/TProductVariant"
import { normalizeProductTranslations } from "./product"

function isProductVariant(value: unknown): value is TProductVariant {
  if (!value || typeof value !== "object") return false

  const candidate = value as Record<string, unknown>
  return typeof candidate.id === "string" && typeof candidate.label === "string" && typeof candidate.image_url === "string"
}

export function normalizeProductVariants(value: unknown): TProductVariant[] | null {
  if (!Array.isArray(value)) return null

  const variants = value.filter(isProductVariant)
  return variants.length ? variants : null
}

export function normalizeProduct<T extends { variants?: unknown; translations?: unknown }>(
  product: T,
): Omit<T, "variants" | "translations"> & { variants: TProductVariant[] | null; translations: ProductTranslations } {
  return {
    ...product,
    variants: normalizeProductVariants(product.variants),
    translations: normalizeProductTranslations(product.translations),
  }
}

export function normalizeProducts<T extends { variants?: unknown; translations?: unknown }>(products: T[]) {
  return products.map(product => normalizeProduct(product))
}
