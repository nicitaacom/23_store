"use client"

import { useState } from "react"
import { useSearchParams } from "next/navigation"

import { TDesignPlacement } from "@/ts/product/TPersonalization"
import { TProductDB } from "@/ts/product/TProductDB"
import { readPastedImages } from "../AdminPanel/functions/readPastedImages"
import { uploadDesignFn } from "./functions/uploadDesignFn"
import { ModalQueryContainer } from "../ModalContainers/ModalQueryContainer"
import { PersonalizePreview } from "./components/PersonalizePreview"
import { PersonalizeQualityBadge } from "./components/PersonalizeQualityBadge"
import { computePrintMetrics, resolvePersonalizationConfig } from "@/utils/printMetrics"
import useCartStore from "@/store/user/cartStore"
import { useCurrentLocale, useI18n, useScopedI18n } from "@/locales/client"
import { usePasteImages } from "@/hooks/ui/usePasteImages"
import useToast from "@/store/ui/useToast"
import { Button } from "@/components/ui/Button"

const EMPTY_PLACEMENT: TDesignPlacement = { scale: 1, offsetXPct: 0, offsetYPct: 0 }

interface PersonalizeModalProps {
  products: TProductDB[]
}

// http://localhost:6006/?path=/story/commerce-personalize--sharp-upload
export function PersonalizeModal({ products }: PersonalizeModalProps) {
  const t = useScopedI18n("personalize")
  const tGlobal = useI18n()
  const locale = useCurrentLocale()
  const toast = useToast()
  const queryParams = useSearchParams()
  const { increaseProductQuantity } = useCartStore()

  const productId = queryParams?.get("productId") ?? ""
  const variantId = queryParams?.get("variantId") || null
  const product = products.find(candidate => candidate.id === productId) ?? null
  const config = product ? resolvePersonalizationConfig(product, variantId) : null

  const [designFile, setDesignFile] = useState<File | null>(null)
  const [designUrl, setDesignUrl] = useState<string | null>(null)
  const [sourceSize, setSourceSize] = useState({ widthPx: 0, heightPx: 0 })
  const [placement, setPlacement] = useState<TDesignPlacement>(EMPTY_PLACEMENT)
  const [isUploading, setIsUploading] = useState(false)

  async function selectDesignFiles(files: File[]) {
    const [file] = files
    if (!file) return

    const readPastedImagesResp = await readPastedImages([file], 0)
    const [image] = readPastedImagesResp.images

    if (!image?.data_url || !image.file) {
      toast.show("warning", t("upload_rejected_title"), t("upload_rejected_subtitle"))
      return
    }

    const bitmap = await createImageBitmap(image.file)
    setSourceSize({ widthPx: bitmap.width, heightPx: bitmap.height })
    bitmap.close()

    setDesignFile(image.file)
    setDesignUrl(image.data_url)
    setPlacement(EMPTY_PLACEMENT)
  }

  usePasteImages(files => void selectDesignFiles(files), { isHookEnabled: !isUploading })

  const metrics = config
    ? computePrintMetrics({
        printArea: config.printArea,
        sourceWidthPx: sourceSize.widthPx,
        sourceHeightPx: sourceSize.heightPx,
        placement,
      })
    : null

  async function addPersonalizedProductToCart() {
    if (!config || !product || !designFile) return

    setIsUploading(true)
    const uploadDesignResp = await uploadDesignFn({
      t: tGlobal,
      designFile,
      productId: product.id,
      variantId,
      printArea: config.printArea,
      placement,
      sourceWidthPx: sourceSize.widthPx,
      sourceHeightPx: sourceSize.heightPx,
      effectiveDpi: metrics?.effectiveDpi ?? 0,
    })
    setIsUploading(false)

    if (typeof uploadDesignResp === "string") {
      toast.show("error", t("upload_failed_title"), uploadDesignResp)
      return
    }

    increaseProductQuantity(product.id, variantId, uploadDesignResp.designId)
    toast.show("success", t("added_title"), t("added_subtitle"))
    window.history.replaceState(null, "", `/${locale}`)
    window.dispatchEvent(new PopStateEvent("popstate"))
  }

  return (
    <ModalQueryContainer className="w-full max-w-[980px]" modalQuery="PersonalizeModal">
      <div className="grid max-h-[80vh] gap-4 overflow-y-auto p-4 laptop:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
        <h1 className="text-center text-xl font-semibold text-title laptop:col-span-2">{t("title")}</h1>

        {config ? (
          <>
            <PersonalizePreview config={config} designUrl={designUrl} placement={placement} onPlacementChange={setPlacement} />

            <section className="grid content-start gap-3">
              <label className="grid gap-1.5 text-sm text-title">
                {t("image_label")}
                <input
                  className="rounded border border-border-color/50 bg-background p-2 text-sm text-title file:mr-3 file:rounded file:border-0 file:bg-success/15 file:px-3 file:py-1 file:text-success"
                  data-cy="personalize-file-input"
                  type="file"
                  accept="image/*"
                  disabled={isUploading}
                  onChange={event => void selectDesignFiles([...(event.target.files ?? [])])}
                />
              </label>
              <p className="text-xs text-subTitle">{t("paste_hint")}</p>

              {metrics && designUrl && (
                <>
                  <PersonalizeQualityBadge
                    metrics={metrics}
                    printArea={config.printArea}
                    sourceWidthPx={sourceSize.widthPx}
                    sourceHeightPx={sourceSize.heightPx}
                  />

                  <label className="grid gap-1 text-sm text-title">
                    {t("zoom_label")}
                    <input
                      type="range"
                      min={1}
                      max={3}
                      step={0.05}
                      value={placement.scale}
                      onChange={event => setPlacement({ ...placement, scale: Number(event.target.value) })}
                    />
                  </label>
                </>
              )}

              <Button
                className="mt-2"
                variant="default"
                size="lg"
                rounded="lg"
                data-cy="personalize-add-to-cart"
                disabled={!designUrl || isUploading}
                onClick={addPersonalizedProductToCart}>
                {isUploading ? t("adding") : t("add_to_cart")}
              </Button>
            </section>
          </>
        ) : (
          <p className="text-center text-subTitle laptop:col-span-2">{t("unavailable")}</p>
        )}
      </div>
    </ModalQueryContainer>
  )
}
