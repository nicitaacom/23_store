import { TProductVariant } from "@/ts/product/TProductVariant"
import { TProductDB } from "@/ts/product/TProductDB"

// A personalized line is its own line: the same product + variant with two different designs are two
// separate cart entries, so the design id is part of the key.
export function createCartProductKey(productId: string, variantId?: string | null, designId?: string | null) {
  const variantKey = variantId ? `${productId}::${variantId}` : productId
  return designId ? `${variantKey}::${designId}` : variantKey
}

export function getProductVariantById(product: Pick<TProductDB, "variants">, variantId?: string | null): TProductVariant | null {
  if (!variantId) return null
  return product.variants?.find(variant => variant.id === variantId) || null
}

export function getProductPriceForVariant(product: Pick<TProductDB, "price" | "variants">, variantId?: string | null) {
  return getProductVariantById(product, variantId)?.price ?? product.price
}

// The whole fallback chain for "an image is unavoidable here" (cart line, Stripe line item, order
// email) in one place: the variant's own image, else the product's first photo, else the placeholder.
// Never written into the stored row - replacing the product's photos then fixes every imageless
// variant at once.
export function getVariantImageUrl(product: Pick<TProductDB, "img_url">, variant?: TProductVariant | null) {
  return variant?.image_url || product.img_url[0] || "/no-image-fallback.png"
}

// Available stock for the chosen line: a variant uses its own quantity (0 = sold out),
// a variantless product falls back to product-level on_stock. Single source of truth so
// the customer UI and the cart guard agree on what "sold out" means.
export function getAvailableStock(product: Pick<TProductDB, "on_stock" | "variants">, variantId?: string | null) {
  const variant = getProductVariantById(product, variantId)
  return variant ? variant.quantity : product.on_stock
}
