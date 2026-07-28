export type TProductVariant = {
  id: string
  label: string
  // A size variant (S/M/L) looks the same in a photo, so an image is a bonus that turns the selector
  // into a swatch. Without one the variant is a text chip - see getVariantImageUrl for what is shown
  // wherever an image is unavoidable (cart line, Stripe line item, order email).
  image_url?: string | null
  price: number // variant-specific price override
  quantity: number // per-variant stock; 0 = sold out (manual, never auto-decremented)
}

export type TProductVariantDraft = {
  id: string
  label: string
  imageIndex: number
  imageDataUrl?: string | null
  price: number // variant-specific price override
  quantity: number // per-variant stock; 0 = sold out
}
