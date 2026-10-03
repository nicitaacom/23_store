export type TProductVariant = {
  id: string
  label: string
  // A size variant (S/M/L) looks the same in a photo, so an image is a bonus that turns the selector
  // into a swatch. Without one the variant is a text chip - see getVariantImageUrl for what is shown
  // wherever an image is unavoidable (cart line, Stripe line item, order email).
  image_url?: string | null
  // Named choices such as Color=Blue and Weight=2.5 kg. One row represents one purchasable combination.
  options?: Record<string, string>
  // Rows created from one variant draft share this ID, so changing Size/Weight keeps its parent variant.
  group_id?: string
  price: number // variant-specific price override
  quantity: number // per-variant stock; 0 = sold out (manual, never auto-decremented)
}

// Form values can contain several choices for one name. Creating or updating expands them into one row per
// combination, so persisted TProductVariant.options stays one string per name.
export type TVariantOptionValues = Record<string, string[]>

export type TProductVariantDraft = {
  id: string
  label: string
  imageIndex: number
  imageDataUrl?: string | null
  options?: TVariantOptionValues
  group_id?: string
  price: number // variant-specific price override
  quantity: number // per-variant stock; 0 = sold out
}
