"use client"

import { useRef, useState } from "react"

import { TDesignPlacement, TPersonalizationConfig } from "@/ts/product/TPersonalization"
import { formatPrintSize } from "@/utils/printMetrics"
import { useScopedI18n } from "@/locales/client"

interface PersonalizePreviewProps {
  config: TPersonalizationConfig
  designUrl: string | null
  placement: TDesignPlacement
  onPlacementChange: (placement: TDesignPlacement) => void
}

// http://localhost:6006/?path=/story/commerce-personalize--sharp-upload
export function PersonalizePreview({ config, designUrl, placement, onPlacementChange }: PersonalizePreviewProps) {
  const t = useScopedI18n("personalize")
  const printAreaRef = useRef<HTMLDivElement>(null)
  const [isDragging, setIsDragging] = useState(false)

  const { mockupRect, printArea } = config

  // The print area is a % box inside the mockup, so it stays the real print area at any preview width -
  // on a phone and on a 4k screen alike. Everything the buyer sees inside it is what gets printed.
  const printAreaStyle = {
    left: `${mockupRect.leftPct}%`,
    top: `${mockupRect.topPct}%`,
    width: `${mockupRect.widthPct}%`,
    height: `${mockupRect.heightPct}%`,
  }

  function handlePointerDown(event: React.PointerEvent<HTMLDivElement>) {
    if (!designUrl) return
    event.currentTarget.setPointerCapture(event.pointerId)
    setIsDragging(true)
  }

  function handlePointerMove(event: React.PointerEvent<HTMLDivElement>) {
    if (!isDragging || !printAreaRef.current) return

    const printAreaBox = printAreaRef.current.getBoundingClientRect()
    const nextOffsetXPct = placement.offsetXPct + (event.movementX / printAreaBox.width) * 100
    const nextOffsetYPct = placement.offsetYPct + (event.movementY / printAreaBox.height) * 100
    const maxOffsetPct = ((placement.scale - 1) / 2) * 100

    onPlacementChange({
      ...placement,
      offsetXPct: Math.min(Math.max(nextOffsetXPct, -maxOffsetPct), maxOffsetPct),
      offsetYPct: Math.min(Math.max(nextOffsetYPct, -maxOffsetPct), maxOffsetPct),
    })
  }

  function handlePointerUp(event: React.PointerEvent<HTMLDivElement>) {
    event.currentTarget.releasePointerCapture(event.pointerId)
    setIsDragging(false)
  }

  return (
    <figure className="grid gap-2">
      <div className="relative overflow-hidden rounded border border-border-color/40 bg-foreground/10">
        {/* eslint-disable-next-line @next/next/no-img-element -- the mockup URL is admin-configured, not a known-size next/image source */}
        <img className="w-full" src={config.mockupUrl} alt={t("mockup_alt")} />

        <div
          style={printAreaStyle}
          className={`absolute overflow-hidden ${designUrl ? "cursor-grab active:cursor-grabbing" : ""}`}
          data-cy="personalize-print-area"
          ref={printAreaRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}>
          {designUrl && (
            // eslint-disable-next-line @next/next/no-img-element -- a just-uploaded design has no known dimensions for next/image
            <img
              style={{
                transform: `translate(${placement.offsetXPct}%, ${placement.offsetYPct}%) scale(${placement.scale})`,
              }}
              className="h-full w-full object-cover"
              src={designUrl}
              alt={t("design_alt")}
            />
          )}
        </div>

        {/* The dashed outline marks the exact area that reaches the printer - anything outside is trimmed */}
        <span style={printAreaStyle} className="pointer-events-none absolute border-2 border-dashed border-danger" aria-hidden="true" />
      </div>

      <figcaption className="text-xs text-subTitle">
        {t("print_area")}: <span className="font-medium text-title">{formatPrintSize(printArea)}</span>
      </figcaption>
    </figure>
  )
}
