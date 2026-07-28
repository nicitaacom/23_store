export type TPrintArea = {
  widthMm: number
  heightMm: number
  minDpi?: number
}

/**
 * Where the print area sits inside the mockup image, in % of that image.
 * Percentages instead of pixels are what keep the preview honest at any size: the overlay is a % box
 * inside the mockup, so it stays the real print area on a phone and on a 4k screen alike.
 */
export type TMockupRect = {
  leftPct: number
  topPct: number
  widthPct: number
  heightPct: number
}

export type TPersonalizationConfig = {
  mockupUrl: string
  printArea: TPrintArea
  mockupRect: TMockupRect
}

export type TProductPersonalization = {
  isEnabled: boolean
  defaultConfig: TPersonalizationConfig | null
  // keyed by the variant id that already lives in 23_products.variants
  variantConfigs?: Record<string, TPersonalizationConfig>
}

/**
 * What the owner marked out while the product is still being created. The mockup is one of the images
 * queued for upload, so it is held as an index into that queue and turned into a URL by
 * `resolveUploadedPersonalization` once the upload has run.
 */
export type TPersonalizationDraft = {
  isEnabled: boolean
  mockupImageIndex: number
  printArea: TPrintArea
  mockupRect: TMockupRect
}

/**
 * What the print-area editor reports while the product is still being created. `draft` is null until the
 * print area is usable - no mockup, no mm, or a rectangle whose shape drifts from the print size - so
 * `isEnabled && !draft` is the one test for "the owner asked for personalization but it is not right yet".
 */
export type TPersonalizationDraftState = {
  isEnabled: boolean
  draft: TPersonalizationDraft | null
}

export type TDesignPlacement = {
  scale: number // 1 = the image covers the print area, > 1 = zoomed in
  offsetXPct: number
  offsetYPct: number
}

export type TDesignQuality = "great" | "ok" | "low"

export type TPrintMetrics = {
  effectiveDpi: number
  quality: TDesignQuality
  usedWidthPx: number
  usedHeightPx: number
  requiredWidthPx: number
  requiredHeightPx: number
}
