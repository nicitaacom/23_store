"use client"

import { useEffect, useRef, useState } from "react"
import { twMerge } from "tailwind-merge"

import { TMockupRect, TPersonalizationConfig, TPersonalizationDraftState, TProductPersonalization } from "@/ts/product/TPersonalization"
import { aiSDK } from "@/sdk/AISDK/AISDK"
import { formatPrintSize, getAspectCorrectHeightPct, getAspectDrift, MAX_ASPECT_DRIFT } from "@/utils/printMetrics"
import { productsSDK } from "@/sdk/ProductsSDK/ProductsSDK"
import { useOwnerProductsStore } from "@/store/user/ownerProductsStore"
import { useScopedI18n } from "@/locales/client"
import useToast from "@/store/ui/useToast"
import { Button } from "@/components/ui/Button"

// productId is absent while the product is still being created - then there is nothing to update yet,
// so the form reports what was marked out through onDraftChange and the create pipeline stores it.
// onGeneratedMockup is what turns the AI's replacement photo into a product image; without it the
// "generate a matching photo" button stays hidden, since there is nowhere to put the result.
// className lets the admin panel drop the standalone card chrome - the manage page keeps it.
interface PersonalizationFormProps {
  imageUrls: string[]
  productId?: string
  personalization?: TProductPersonalization | null
  className?: string
  onDraftChange?: (draftState: TPersonalizationDraftState) => void
  onGeneratedMockup?: (mockupFile: File) => Promise<string | null>
}

const EMPTY_RECT: TMockupRect = { leftPct: 10, topPct: 10, widthPct: 80, heightPct: 40 }

/**
 * "unchecked" - nothing asked yet, "matching"/"mismatch" - the AI's answer for exactly the print area
 * below, "failed" - the request itself did not go through, which never blocks the owner.
 */
type TPrintAreaVerdict = "unchecked" | "matching" | "mismatch" | "failed"

// http://localhost:6006/?path=/story/admin-personalization--print-area-editor
export function PersonalizationForm({
  imageUrls,
  productId,
  personalization,
  className,
  onDraftChange,
  onGeneratedMockup,
}: PersonalizationFormProps) {
  const t = useScopedI18n("personalize")
  const toast = useToast()
  const { replaceProduct } = useOwnerProductsStore()
  const dragStartRef = useRef<{ xPct: number; yPct: number } | null>(null)

  const savedConfig = personalization?.defaultConfig ?? null
  const [isEnabled, setIsEnabled] = useState(Boolean(personalization?.isEnabled))
  const [pickedMockupUrl, setPickedMockupUrl] = useState(savedConfig?.mockupUrl ?? "")
  const [widthMmValue, setWidthMmValue] = useState(String(savedConfig?.printArea.widthMm ?? ""))
  const [heightMmValue, setHeightMmValue] = useState(String(savedConfig?.printArea.heightMm ?? ""))
  const [mockupRect, setMockupRect] = useState<TMockupRect>(savedConfig?.mockupRect ?? EMPTY_RECT)
  const [isUpdatingConfig, setIsUpdatingConfig] = useState(false)
  // The mockup's own pixel size decides what the drawn percentages mean, so it is state the image
  // reports when it appears - a ref would be read during render, which React forbids.
  const [mockupSize, setMockupSize] = useState({ widthPx: 0, heightPx: 0 })
  const [verdict, setVerdict] = useState<TPrintAreaVerdict>("unchecked")
  const [checkedSignature, setCheckedSignature] = useState("")
  const [isCheckingPrintArea, setIsCheckingPrintArea] = useState(false)
  const [isGeneratingMockup, setIsGeneratingMockup] = useState(false)

  // In Add product the gallery is still filling up, and on the Edit tab the picked photo can be
  // removed - either way the first image takes over, so the choice never points at a missing image.
  const mockupUrl = pickedMockupUrl && imageUrls.includes(pickedMockupUrl) ? pickedMockupUrl : (imageUrls[0] ?? "")

  const printArea = { widthMm: Number(widthMmValue) || 0, heightMm: Number(heightMmValue) || 0 }
  const isPrintAreaSet = printArea.widthMm > 0 && printArea.heightMm > 0

  const aspectDrift = isPrintAreaSet ? getAspectDrift(mockupRect, printArea, mockupSize.widthPx, mockupSize.heightPx) : 0
  const isRectHonest = aspectDrift <= MAX_ASPECT_DRIFT

  // The arithmetic half: a mockup, both mm, and a rectangle shaped like the print size.
  const isShapeReady = !isEnabled || (Boolean(mockupUrl) && isPrintAreaSet && isRectHonest)

  // A verdict belongs to one exact configuration. Move the rectangle or retype the mm and it goes back
  // to "unchecked", so a passed check on an older rectangle never lets a new one through.
  const printAreaSignature = `${mockupUrl}|${widthMmValue}x${heightMmValue}|${mockupRect.leftPct},${mockupRect.topPct},${mockupRect.widthPct},${mockupRect.heightPct}`
  const currentVerdict: TPrintAreaVerdict = checkedSignature === printAreaSignature ? verdict : "unchecked"

  // "Fix the shape" only makes the rectangle the right SHAPE - it says nothing about where it sits, so
  // the AI verdict is part of the gate too. A failed request never blocks: the owner keeps working.
  const isPrintAreaReady =
    isShapeReady && (!isEnabled || currentVerdict === "matching" || currentVerdict === "failed")

  // Held in a ref so the effect below never lists a function prop in its deps
  const onDraftChangeRef = useRef(onDraftChange)
  useEffect(() => {
    onDraftChangeRef.current = onDraftChange
  })

  useEffect(() => {
    if (!onDraftChangeRef.current) return
    const mockupImageIndex = imageUrls.indexOf(mockupUrl)
    onDraftChangeRef.current({
      isEnabled,
      draft: isEnabled && isPrintAreaReady && mockupImageIndex >= 0 ? { isEnabled: true, mockupImageIndex, printArea, mockupRect } : null,
    })
    // printArea is rebuilt every render, so the two typed values stand in for it
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imageUrls, mockupUrl, isEnabled, isPrintAreaReady, widthMmValue, heightMmValue, mockupRect])

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

  // Asks the AI where the printable surface actually is and compares it with the marked rectangle. The
  // rectangle is a parameter so "Fix the shape" can check the snapped one instead of the stale state.
  async function checkPrintArea(rectToCheck: TMockupRect) {
    if (!mockupUrl || !isPrintAreaSet) return

    const signatureAtRequest = `${mockupUrl}|${widthMmValue}x${heightMmValue}|${rectToCheck.leftPct},${rectToCheck.topPct},${rectToCheck.widthPct},${rectToCheck.heightPct}`
    setIsCheckingPrintArea(true)

    try {
      const checkPrintAreaResp = await aiSDK.checkPrintArea({ mockupUrl, mockupRect: rectToCheck, printArea })
      if ("error" in checkPrintAreaResp) throw new Error(checkPrintAreaResp.error)

      setVerdict(checkPrintAreaResp.isMatching ? "matching" : "mismatch")
    } catch (error) {
      // A check that never ran is not evidence of a bad print area, so it leaves the owner unblocked
      setVerdict("failed")
      toast.show("warning", t("admin_ai_failed_title"), error instanceof Error ? error.message : String(error))
    } finally {
      setCheckedSignature(signatureAtRequest)
      setIsCheckingPrintArea(false)
    }
  }

  // Snaps the height so the drawn rectangle has the proportions of the physical print area - without
  // it the buyer's preview shows a crop that never reaches the printer. The AI check follows, because
  // the right shape in the wrong place is exactly what the arithmetic alone lets through.
  function snapRectToPrintArea() {
    const snappedRect = {
      ...mockupRect,
      heightPct: getAspectCorrectHeightPct(mockupRect, printArea, mockupSize.widthPx, mockupSize.heightPx),
    }
    setMockupRect(snappedRect)
    void checkPrintArea(snappedRect)
  }

  // The AI says the marked area is not the product, so it draws a photo whose printable surface has the
  // proportions of the print size - marking that one gives a rectangle the buyer's preview can trust.
  async function generateMatchingMockup() {
    if (!onGeneratedMockup || !isPrintAreaSet) return

    setIsGeneratingMockup(true)
    try {
      const { buffer, contentType } = await aiSDK.generateImageBuffer(
        `a product whose printable surface measures ${printArea.widthMm} by ${printArea.heightMm} millimetres, photographed straight from above, centred, filling the frame edge to edge on a single-colour background, so the printable surface in the picture has exactly the proportions ${printArea.widthMm}:${printArea.heightMm}`,
      )
      const fileExtension = contentType.split("/")[1] || "png"
      const addedMockupUrl = await onGeneratedMockup(
        new File([buffer], `print-area-${printArea.widthMm}x${printArea.heightMm}.${fileExtension}`, { type: contentType }),
      )

      // Picking it moves the signature on, so the verdict goes back to "unchecked" for the new photo
      if (addedMockupUrl) setPickedMockupUrl(addedMockupUrl)
      toast.show("success", t("admin_ai_generated_title"), t("admin_ai_generated_subtitle"))
    } catch (error) {
      toast.show("error", t("admin_ai_failed_title"), error instanceof Error ? error.message : String(error))
    } finally {
      setIsGeneratingMockup(false)
    }
  }

  async function updatePersonalization() {
    if (!productId) return

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
        productId,
        personalization: isEnabled ? { isEnabled: true, defaultConfig: config } : null,
      })
      // Keeps the admin panel's product row in step with what was written; a no-op on the manage
      // page, where this product is not in the owner products store.
      replaceProduct(productId, response.product)
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

            {/* onDragStart is refused for the whole box: an image the browser is allowed to drag steals
                the pointer mid-rectangle, and Add product's drop zone then takes the drop as a new upload */}
            <div
              className="relative w-full cursor-crosshair select-none overflow-hidden rounded border border-border-color/40"
              data-cy="personalization-mockup"
              onDragStart={event => event.preventDefault()}
              onPointerDown={startDrawing}
              onPointerMove={drawRect}
              onPointerUp={stopDrawing}>
              {/* eslint-disable-next-line @next/next/no-img-element -- the mockup is one of the product's own uploads, with no size known to next/image */}
              <img
                className="w-full"
                draggable={false}
                data-cy="personalization-mockup-image"
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
              {imageUrls.map(imageUrl => (
                <button
                  className={`h-14 w-14 overflow-hidden rounded border ${mockupUrl === imageUrl ? "border-success" : "border-border-color/40"}`}
                  key={imageUrl}
                  type="button"
                  onClick={() => setPickedMockupUrl(imageUrl)}>
                  {/* eslint-disable-next-line @next/next/no-img-element -- thumbnails of the product's own uploads */}
                  <img className="h-full w-full object-cover" draggable={false} src={imageUrl} alt={t("mockup_alt")} />
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

            {/* The one place that says why a half-marked print area blocks the button */}
            {!isShapeReady && (
              <p className="rounded border border-warning/40 bg-warning/10 p-2 text-xs text-warning" role="status">
                {t("admin_dimensions_required")}
              </p>
            )}

            {/* The AI half: the shape is right, but is the rectangle on the product at all? */}
            {isEnabled && isShapeReady && (
              <div className="grid gap-2">
                <Button
                  type="button"
                  variant="secondary-outline"
                  size="sm"
                  rounded="sm"
                  data-cy="personalization-ai-check"
                  disabled={isCheckingPrintArea}
                  onClick={() => void checkPrintArea(mockupRect)}>
                  {isCheckingPrintArea ? t("admin_ai_checking") : t("admin_ai_check")}
                </Button>

                {currentVerdict === "unchecked" && !isCheckingPrintArea && (
                  <p className="text-xs text-subTitle" role="status">
                    {t("admin_ai_unchecked")}
                  </p>
                )}

                {currentVerdict === "matching" && (
                  <p className="text-xs text-success" role="status">
                    {t("admin_ai_matching")}
                  </p>
                )}

                {currentVerdict === "failed" && (
                  <p className="text-xs text-subTitle" role="status">
                    {t("admin_ai_unavailable")}
                  </p>
                )}

                {currentVerdict === "mismatch" && (
                  <div className="grid gap-2 rounded border border-danger/40 bg-danger/10 p-2" data-cy="personalization-ai-mismatch">
                    <p className="text-xs text-danger" role="status">
                      {t("admin_ai_mismatch")}
                    </p>
                    {onGeneratedMockup && (
                      <Button
                        type="button"
                        variant="danger-outline"
                        size="sm"
                        rounded="sm"
                        data-cy="personalization-ai-generate"
                        disabled={isGeneratingMockup}
                        onClick={() => void generateMatchingMockup()}>
                        {isGeneratingMockup ? t("admin_ai_generating") : t("admin_ai_generate")}
                      </Button>
                    )}
                  </div>
                )}
              </div>
            )}

            {productId ? (
              <Button
                className="mt-1"
                type="button"
                variant="success"
                size="lg"
                rounded="lg"
                data-cy="personalization-save"
                disabled={isUpdatingConfig || !isPrintAreaReady}
                onClick={updatePersonalization}>
                {isUpdatingConfig ? t("admin_updating") : t("admin_update")}
              </Button>
            ) : (
              // Nothing to update yet - "Create product" writes this together with the rest
              <p className="mt-1 text-xs text-subTitle">{t("admin_draft_hint")}</p>
            )}
          </div>
        </div>
      )}
    </section>
  )
}
