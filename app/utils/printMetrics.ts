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
