"use client"

import { useRef, useState } from "react"
import { twMerge } from "tailwind-merge"

import { TMockupRect, TPersonalizationConfig } from "@/ts/product/TPersonalization"
import { TProductDB } from "@/ts/product/TProductDB"
import { formatPrintSize, getAspectCorrectHeightPct, getAspectDrift, MAX_ASPECT_DRIFT } from "@/utils/printMetrics"
import { productsSDK } from "@/sdk/ProductsSDK/ProductsSDK"
import { useOwnerProductsStore } from "@/store/user/ownerProductsStore"
import { useScopedI18n } from "@/locales/client"
import useToast from "@/store/ui/useToast"
import { Button } from "@/components/ui/Button"

// className lets the admin panel drop the standalone card chrome - the manage page keeps it.
interface PersonalizationFormProps {
  product: TProductDB
  className?: string
}

const EMPTY_RECT: TMockupRect = { leftPct: 10, topPct: 10, widthPct: 80, heightPct: 40 }

// http://localhost:6006/?path=/story/admin-personalization--print-area-editor
export function PersonalizationForm({ product, className }: PersonalizationFormProps) {
  const t = useScopedI18n("personalize")
  const toast = useToast()
  const { replaceProduct } = useOwnerProductsStore()
  const dragStartRef = useRef<{ xPct: number; yPct: number } | null>(null)

  const savedConfig = product.personalization?.defaultConfig ?? null
  const [isEnabled, setIsEnabled] = useState(Boolean(product.personalization?.isEnabled))
  const [mockupUrl, setMockupUrl] = useState(savedConfig?.mockupUrl ?? product.img_url[0] ?? "")
  const [widthMmValue, setWidthMmValue] = useState(String(savedConfig?.printArea.widthMm ?? ""))
  const [heightMmValue, setHeightMmValue] = useState(String(savedConfig?.printArea.heightMm ?? ""))
  const [mockupRect, setMockupRect] = useState<TMockupRect>(savedConfig?.mockupRect ?? EMPTY_RECT)
  const [isUpdatingConfig, setIsUpdatingConfig] = useState(false)
  // The mockup's own pixel size decides what the drawn percentages mean, so it is state the image
  // reports when it appears - a ref would be read during render, which React forbids.
  const [mockupSize, setMockupSize] = useState({ widthPx: 0, heightPx: 0 })

  const printArea = { widthMm: Number(widthMmValue) || 0, heightMm: Number(heightMmValue) || 0 }
  const isPrintAreaSet = printArea.widthMm > 0 && printArea.heightMm > 0

  const aspectDrift = isPrintAreaSet ? getAspectDrift(mockupRect, printArea, mockupSize.widthPx, mockupSize.heightPx) : 0
  const isRectHonest = aspectDrift <= MAX_ASPECT_DRIFT

  function getPointerPct(event: React.PointerEvent<HTMLDivElement>) {
    const box = event.currentTarget.getBoundingClientRect()
    return {
      xPct: Math.min(Math.max(((event.clientX - box.left) / box.width) * 100, 0), 100),
      yPct: Math.min(Math.max(((event.clientY - box.top) / box.height) * 100, 0), 100),
    }
  }

  function startDrawing(event: React.PointerEvent<HTMLDivElement>) {
    event.currentTarget.setPointerCapture(event.pointerId)
    dragStartRef.current = getPointerPct(event)
  }

  function drawRect(event: React.PointerEvent<HTMLDivElement>) {
    const dragStart = dragStartRef.current
    if (!dragStart) return

    const pointer = getPointerPct(event)
    setMockupRect({
      leftPct: Math.min(dragStart.xPct, pointer.xPct),
      topPct: Math.min(dragStart.yPct, pointer.yPct),
      widthPct: Math.max(Math.abs(pointer.xPct - dragStart.xPct), 1),
      heightPct: Math.max(Math.abs(pointer.yPct - dragStart.yPct), 1),
    })
  }

  function stopDrawing(event: React.PointerEvent<HTMLDivElement>) {
    event.currentTarget.releasePointerCapture(event.pointerId)
    dragStartRef.current = null
  }

  // Snaps the height so the drawn rectangle has the proportions of the physical print area - without
  // it the buyer's preview shows a crop that never reaches the printer.
  function snapRectToPrintArea() {
    setMockupRect(current => ({
      ...current,
      heightPct: getAspectCorrectHeightPct(current, printArea, mockupSize.widthPx, mockupSize.heightPx),
    }))
  }

  async function updatePersonalization() {
    if (isEnabled && (!isPrintAreaSet || !mockupUrl)) {
      toast.show("warning", t("admin_incomplete_title"), t("admin_incomplete_subtitle"))
      return
    }

    const config: TPersonalizationConfig = {
      mockupUrl,
      printArea: { ...printArea, minDpi: savedConfig?.printArea.minDpi ?? 150 },
      mockupRect,
    }

    setIsUpdatingConfig(true)
    try {
      const response = await productsSDK.updateProduct({
        productId: product.id,
        personalization: isEnabled ? { isEnabled: true, defaultConfig: config } : null,
      })
      // Keeps the admin panel's product row in step with what was written; a no-op on the manage
      // page, where this product is not in the owner products store.
      replaceProduct(product.id, response.product)
      toast.show("success", t("admin_updated_title"), t("admin_updated_subtitle"))
    } catch (error) {
      toast.show("error", t("admin_failed_title"), error instanceof Error ? error.message : String(error))
    } finally {
      setIsUpdatingConfig(false)
    }
  }

  return (
    <section
      className={twMerge(
        "rounded-2xl border border-white/8 bg-[linear-gradient(180deg,rgba(10,13,18,0.98),rgba(7,9,13,0.99))] p-6 shadow-[0_18px_60px_rgba(0,0,0,0.28)]",
        className,
      )}
      data-cy="personalization-form">
      <h2 className="text-lg font-semibold text-title">{t("admin_title")}</h2>
      <p className="mt-1 text-sm text-subTitle">{t("admin_subtitle")}</p>

      <label className="mt-4 flex w-fit items-center gap-2 text-sm text-title">
        <input
          type="checkbox"
          data-cy="personalization-enabled"
          checked={isEnabled}
          onChange={event => setIsEnabled(event.target.checked)}
        />
        {t("admin_enable")}
      </label>

      {isEnabled && (
        <div className="mt-4 grid gap-4 laptop:grid-cols-[minmax(0,1fr)_260px]">
          <div className="grid gap-2">
            <p className="text-xs uppercase tracking-widest text-subTitle">{t("admin_draw_hint")}</p>

            <div
              className="relative w-full cursor-crosshair select-none overflow-hidden rounded border border-border-color/40"
              data-cy="personalization-mockup"
              onPointerDown={startDrawing}
              onPointerMove={drawRect}
              onPointerUp={stopDrawing}>
              {/* eslint-disable-next-line @next/next/no-img-element -- the mockup is one of the product's own uploads, with no size known to next/image */}
              <img
                className="w-full"
                src={mockupUrl || "/placeholder.jpg"}
                alt={t("mockup_alt")}
                onLoad={event =>
                  setMockupSize({ widthPx: event.currentTarget.naturalWidth, heightPx: event.currentTarget.naturalHeight })
                }
              />
              <span
                style={{
                  left: `${mockupRect.leftPct}%`,
                  top: `${mockupRect.topPct}%`,
                  width: `${mockupRect.widthPct}%`,
                  height: `${mockupRect.heightPct}%`,
                }}
                className={`pointer-events-none absolute border-2 border-dashed ${isRectHonest ? "border-success" : "border-danger"}`}
              />
            </div>

            <div className="flex flex-wrap gap-2">
              {product.img_url.map(imageUrl => (
                <button
                  className={`h-14 w-14 overflow-hidden rounded border ${mockupUrl === imageUrl ? "border-success" : "border-border-color/40"}`}
                  key={imageUrl}
                  type="button"
                  onClick={() => setMockupUrl(imageUrl)}>
                  {/* eslint-disable-next-line @next/next/no-img-element -- thumbnails of the product's own uploads */}
                  <img className="h-full w-full object-cover" src={imageUrl} alt={t("mockup_alt")} />
                </button>
              ))}
            </div>
          </div>

          <div className="grid content-start gap-3">
            <label className="grid gap-1 text-sm text-title">
              {t("admin_width_mm")}
              <input
                className="rounded border border-border-color/40 bg-background p-2 text-title"
                data-cy="personalization-width-mm"
                type="number"
                min={1}
                value={widthMmValue}
                onChange={event => setWidthMmValue(event.target.value)}
              />
            </label>

            <label className="grid gap-1 text-sm text-title">
              {t("admin_height_mm")}
              <input
                className="rounded border border-border-color/40 bg-background p-2 text-title"
                data-cy="personalization-height-mm"
                type="number"
                min={1}
                value={heightMmValue}
                onChange={event => setHeightMmValue(event.target.value)}
              />
            </label>

            {isPrintAreaSet && <p className="text-xs text-subTitle">{formatPrintSize(printArea)}</p>}

            {isPrintAreaSet && !isRectHonest && (
              <div className="grid gap-2 rounded border border-danger/40 bg-danger/10 p-2">
                <p className="text-xs text-danger" role="status">
                  {t("admin_aspect_warning", { drift: Math.round(aspectDrift * 100) })}
                </p>
                <Button type="button" variant="danger-outline" size="sm" rounded="sm" onClick={snapRectToPrintArea}>
                  {t("admin_snap")}
                </Button>
              </div>
            )}

            <Button
              className="mt-1"
              type="button"
              variant="success"
              size="lg"
              rounded="lg"
              data-cy="personalization-save"
              disabled={isUpdatingConfig}
              onClick={updatePersonalization}>
              {isUpdatingConfig ? t("admin_updating") : t("admin_update")}
            </Button>
          </div>
        </div>
      )}
    </section>
  )
}
