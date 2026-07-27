import { TProductAfterDB } from "@/ts/product/TProductAfterDB"

/**
 * The line-item name is the only per-line text that reaches the payment dashboard - there is no
 * metadata and no webhook on this checkout. A personalized line therefore ends with the first 8
 * characters of its design id, which is what the owner searches for in 23_personalized_designs to
 * pull the file, the print size and the DPI.
 */
export function buildStripeLineName(product: TProductAfterDB) {
  const variantName = product.selectedVariant
    ? `${product.translations.fi.title} - ${product.selectedVariant.label}`
    : product.translations.fi.title

  return product.designId ? `${variantName} · design ${product.designId.slice(0, 8)}` : variantName
}
