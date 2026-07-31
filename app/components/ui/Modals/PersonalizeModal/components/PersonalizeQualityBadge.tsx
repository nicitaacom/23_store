"use client"

import { TPrintArea, TPrintMetrics } from "@/ts/product/TPersonalization"
import { formatNumber } from "@/utils/numberFormatter"
import { useScopedI18n } from "@/locales/client"
import { DEFAULT_MIN_DPI } from "@/utils/printMetrics"

interface PersonalizeQualityBadgeProps {
  metrics: TPrintMetrics
  printArea: TPrintArea
  sourceWidthPx: number
  sourceHeightPx: number
}

const qualityClassName = {
  great: "border-success/40 bg-success/10 text-success",
  ok: "border-warning/40 bg-warning/10 text-warning",
  low: "border-danger/40 bg-danger/10 text-danger",
} as const

// http://localhost:6006/?path=/story/commerce-personalize--low-resolution-upload
export function PersonalizeQualityBadge({ metrics, printArea, sourceWidthPx, sourceHeightPx }: PersonalizeQualityBadgeProps) {
  const t = useScopedI18n("personalize")
  const minDpi = printArea.minDpi ?? DEFAULT_MIN_DPI

  return (
    <div className="grid gap-1.5" data-cy="personalize-quality">
      <span
        className={`w-fit rounded-full border px-2.5 py-0.5 text-xs font-semibold ${qualityClassName[metrics.quality]}`}
        role="status">
        {/* eslint-disable-next-line local-rules/no-untranslated-ui -- DPI is an international technical unit, not translated */}
        {t(`quality_${metrics.quality}`)} · {metrics.effectiveDpi} DPI
      </span>

      {/* The number the buyer needs: not "too small", but how many pixels this print size asks for */}
      {metrics.quality === "low" && (
        <p className="text-xs leading-5 text-subTitle">
          {t("needs_pixels", {
            requiredWidth: formatNumber(metrics.requiredWidthPx),
            requiredHeight: formatNumber(metrics.requiredHeightPx),
            minDpi,
          })}{" "}
          {t("yours_pixels", {
            sourceWidth: formatNumber(sourceWidthPx),
            sourceHeight: formatNumber(sourceHeightPx),
            effectiveDpi: metrics.effectiveDpi,
          })}
        </p>
      )}
    </div>
  )
}
