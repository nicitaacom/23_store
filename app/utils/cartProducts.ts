import { TProductDB } from "@/ts/product/TProductDB"
import { TProductVariant } from "@/ts/product/TProductVariant"

export function createCartProductKey(productId: string, variantId?: string | null) {
  return variantId ? `${productId}::${variantId}` : productId
}

export function getProductVariantById(product: Pick<TProductDB, "variants">, variantId?: string | null): TProductVariant | null {
  if (!variantId) return null
  return product.variants?.find(variant => variant.id === variantId) || null
}

export function getProductPriceForVariant(product: Pick<TProductDB, "price" | "variants">, variantId?: string | null) {
  return getProductVariantById(product, variantId)?.price ?? product.price
}
