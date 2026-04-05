export type TProductVariant = {
  id: string
  label: string
  image_url: string
  price: number // variant-specific price override
}

export type TProductVariantDraft = {
  id: string
  label: string
  imageIndex: number
  imageDataUrl: string
  price: number // variant-specific price override
}
