import {
  TDesignPlacement,
  TDesignQuality,
  TMockupRect,
  TPersonalizationConfig,
  TPrintArea,
  TPrintMetrics,
} from "@/ts/product/TPersonalization"
import { TProductDB } from "@/ts/product/TProductDB"

const MM_PER_INCH = 25.4
export const DEFAULT_MIN_DPI = 150
export const GREAT_DPI = 300
// Above this the on-screen rectangle is a different shape than the real print area, so the preview
// would show a crop the buyer never gets.
export const MAX_ASPECT_DRIFT = 0.02

/** The variant's own config wins; a product without per-variant sizes falls back to the default one. */
export function resolvePersonalizationConfig(
  product: Pick<TProductDB, "personalization">,
  variantId?: string | null,
): TPersonalizationConfig | null {
  const personalization = product.personalization
  if (!personalization?.isEnabled) return null

  const variantConfig = variantId ? personalization.variantConfigs?.[variantId] : null
  return variantConfig ?? personalization.defaultConfig ?? null
}

export function getPrintAspect(printArea: TPrintArea) {
  return printArea.widthMm / printArea.heightMm
}

/**
 * How far the mockup rectangle is from the real print area's shape, as a ratio.
 * `0` = the rectangle on the mockup has exactly the proportions of the physical print area.
 */
export function getAspectDrift(
  mockupRect: TMockupRect,
  printArea: TPrintArea,
  mockupNaturalWidthPx: number,
  mockupNaturalHeightPx: number,
) {
  if (!mockupNaturalWidthPx || !mockupNaturalHeightPx || !mockupRect.heightPct) return 0

  const rectAspect = (mockupRect.widthPct * mockupNaturalWidthPx) / (mockupRect.heightPct * mockupNaturalHeightPx)
  const printAspect = getPrintAspect(printArea)

  return Math.abs(rectAspect - printAspect) / printAspect
}

/** The `heightPct` that gives the mockup rectangle the proportions of the real print area. */
export function getAspectCorrectHeightPct(
  mockupRect: TMockupRect,
  printArea: TPrintArea,
  mockupNaturalWidthPx: number,
  mockupNaturalHeightPx: number,
) {
  if (!mockupNaturalHeightPx) return mockupRect.heightPct
  return (mockupRect.widthPct * mockupNaturalWidthPx) / (getPrintAspect(printArea) * mockupNaturalHeightPx)
}

// "Fix the shape" only gives the rectangle the proportions of the print size - it says nothing about
// WHERE the rectangle sits. A box drawn over the desk instead of the mousepad passes that check and
// still prints nothing like the physical product, so these two numbers compare the marked rectangle
// with the surface a vision model found in the same photo.
export const MIN_PRODUCT_SURFACE_COVERAGE = 0.7
export const MAX_MARKED_AREA_SPILL = 0.2

export type TPrintAreaOverlap = {
  /** how much of the printable surface the marked rectangle covers, 0-1 */
  coverage: number
  /** how much of the marked rectangle falls outside that surface, 0-1 */
  spill: number
}

export function getPrintAreaOverlap(markedRect: TMockupRect, productRect: TMockupRect): TPrintAreaOverlap {
  const overlapWidthPct = Math.max(
    0,
    Math.min(markedRect.leftPct + markedRect.widthPct, productRect.leftPct + productRect.widthPct) -
      Math.max(markedRect.leftPct, productRect.leftPct),
  )
  const overlapHeightPct = Math.max(
    0,
    Math.min(markedRect.topPct + markedRect.heightPct, productRect.topPct + productRect.heightPct) -
      Math.max(markedRect.topPct, productRect.topPct),
  )

  const overlapArea = overlapWidthPct * overlapHeightPct
  const markedArea = markedRect.widthPct * markedRect.heightPct
  const productArea = productRect.widthPct * productRect.heightPct

  return {
    coverage: productArea > 0 ? Math.min(overlapArea / productArea, 1) : 0,
    spill: markedArea > 0 ? Math.max(0, 1 - overlapArea / markedArea) : 1,
  }
}

export function isMarkedAreaOnProduct(overlap: TPrintAreaOverlap) {
  return overlap.coverage >= MIN_PRODUCT_SURFACE_COVERAGE && overlap.spill <= MAX_MARKED_AREA_SPILL
}

/** Pixels an upload needs to reach `dpi` over the whole print area. */
export function getRequiredPixels(printArea: TPrintArea, dpi: number) {
  return {
    width: Math.ceil((dpi * printArea.widthMm) / MM_PER_INCH),
    height: Math.ceil((dpi * printArea.heightMm) / MM_PER_INCH),
  }
}

function getQuality(effectiveDpi: number, minDpi: number): TDesignQuality {
  if (effectiveDpi >= GREAT_DPI) return "great"
  if (effectiveDpi >= minDpi) return "ok"
  return "low"
}

/**
 * What the buyer actually gets printed.
 *
 * The image covers the print area (the part that sticks out is cropped), so only a rectangle with the
 * print area's proportions is used. Zooming in with `placement.scale` uses even less of the source,
 * which is exactly why the DPI drops as the buyer zooms.
 */
export function computePrintMetrics({
  printArea,
  sourceWidthPx,
  sourceHeightPx,
  placement,
}: {
  printArea: TPrintArea
  sourceWidthPx: number
  sourceHeightPx: number
  placement?: TDesignPlacement
}): TPrintMetrics {
  const minDpi = printArea.minDpi ?? DEFAULT_MIN_DPI
  const required = getRequiredPixels(printArea, minDpi)

  if (sourceWidthPx <= 0 || sourceHeightPx <= 0) {
    return {
      effectiveDpi: 0,
      quality: "low",
      usedWidthPx: 0,
      usedHeightPx: 0,
      requiredWidthPx: required.width,
      requiredHeightPx: required.height,
    }
  }

  const printAspect = getPrintAspect(printArea)
  const sourceAspect = sourceWidthPx / sourceHeightPx
  const scale = Math.max(placement?.scale ?? 1, 1)

  const usedHeightPx = (sourceAspect >= printAspect ? sourceHeightPx : sourceWidthPx / printAspect) / scale
  const usedWidthPx = usedHeightPx * printAspect

  const effectiveDpi = Math.floor(
    Math.min(usedWidthPx / (printArea.widthMm / MM_PER_INCH), usedHeightPx / (printArea.heightMm / MM_PER_INCH)),
  )

  return {
    effectiveDpi,
    quality: getQuality(effectiveDpi, minDpi),
    usedWidthPx: Math.round(usedWidthPx),
    usedHeightPx: Math.round(usedHeightPx),
    requiredWidthPx: required.width,
    requiredHeightPx: required.height,
  }
}

/** "900 x 400 mm · 35.4 x 15.7 in" - the buyer reads the real size, not a guess. */
export function formatPrintSize(printArea: TPrintArea) {
  const widthIn = (printArea.widthMm / MM_PER_INCH).toFixed(1)
  const heightIn = (printArea.heightMm / MM_PER_INCH).toFixed(1)

  return `${printArea.widthMm} × ${printArea.heightMm} mm · ${widthIn} × ${heightIn} in`
}
