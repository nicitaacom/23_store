export type TProductVariant = {
  id: string
  label: string
  image_url: string
  price: number // variant-specific price override
  quantity: number // per-variant stock; 0 = sold out (manual, never auto-decremented)
}

export type TProductVariantDraft = {
  id: string
  label: string
  imageIndex: number
  imageDataUrl: string
  price: number // variant-specific price override
  quantity: number // per-variant stock; 0 = sold out
}
