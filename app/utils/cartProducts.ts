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

// Available stock for the chosen line: a variant uses its own quantity (0 = sold out),
// a variantless product falls back to product-level on_stock. Single source of truth so
// the customer UI and the cart guard agree on what "sold out" means.
export function getAvailableStock(product: Pick<TProductDB, "on_stock" | "variants">, variantId?: string | null) {
  const variant = getProductVariantById(product, variantId)
  return variant ? variant.quantity : product.on_stock
}
