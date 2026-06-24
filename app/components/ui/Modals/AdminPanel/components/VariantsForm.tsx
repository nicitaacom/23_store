"use client"

import Image from "next/image"
import { useCallback, useMemo, useState } from "react"
import { BiPlus, BiTrash } from "react-icons/bi"
import { FiSave } from "react-icons/fi"
import { twMerge } from "tailwind-merge"

import { Button } from "@/components/ui"
import { MAX_PRODUCT_VARIANTS } from "@/constants/uploadLimits"
import { useScopedI18n } from "@/locales/client"
import { productsSDK } from "@/sdk/ProductsSDK/ProductsSDK"
import { useLoading } from "@/store/ui/useLoading"
import useToast from "@/store/ui/useToast"
import { useOwnerProductsStore } from "@/store/user/ownerProductsStore"
import { TProductVariant } from "@/ts/product/TProductVariant"
import { BaseInput } from "../../../Inputs/BaseInput"
import { formatGroupedNumberInput, parseFormattedNumber } from "@/utils/numberFormatter"

interface VariantsFormProps {
  id: string
  imgUrl: string[]
  variants: TProductVariant[] | null
  price: number
}

// Local editable copy of a variant — price/quantity kept as formatted input strings while typing
type VariantDraft = {
  id: string
  label: string
  image_url: string
  priceInput: string
  quantityInput: string
}

function toDrafts(variants: TProductVariant[] | null): VariantDraft[] {
  return (variants || []).map(variant => ({
    id: variant.id,
    label: variant.label,
    image_url: variant.image_url,
    priceInput: variant.price > 0 ? formatGroupedNumberInput(String(variant.price)) : "",
    quantityInput: formatGroupedNumberInput(String(variant.quantity)),
  }))
}

// Stable string used to detect "dirty" drafts vs what is persisted
function signature(drafts: VariantDraft[]) {
  return JSON.stringify(
    drafts.map(draft => ({
      id: draft.id,
      label: draft.label.trim(),
      image_url: draft.image_url,
      price: parseFormattedNumber(draft.priceInput),
      quantity: parseFormattedNumber(draft.quantityInput),
    })),
  )
}

export function VariantsForm({ id, imgUrl, variants, price }: VariantsFormProps) {
  const t = useScopedI18n("product")
  const toast = useToast()
  const { isLoading, setIsLoading } = useLoading()
  const { replaceProduct } = useOwnerProductsStore()

  const [drafts, setDrafts] = useState<VariantDraft[]>(() => toDrafts(variants))

  const persistedSignature = useMemo(() => signature(toDrafts(variants)), [variants])
  const isDirty = signature(drafts) !== persistedSignature

  // 1. Per-field draft mutations
  const updateDraft = useCallback((variantId: string, patch: Partial<VariantDraft>) => {
    setDrafts(current => current.map(draft => (draft.id === variantId ? { ...draft, ...patch } : draft)))
  }, [])

  const removeDraft = useCallback((variantId: string) => {
    setDrafts(current => current.filter(draft => draft.id !== variantId))
  }, [])

  const addDraft = useCallback(() => {
    if (!imgUrl.length) {
      return toast.show("warning", t("manage_upload_image_first_title"), t("manage_upload_image_first_subtitle"))
    }
    if (drafts.length >= MAX_PRODUCT_VARIANTS) {
      return toast.show(
        "warning",
        t("warning.max_variants_title", { maxVariants: MAX_PRODUCT_VARIANTS }),
        t("warning.max_variants_subtitle", { maxVariants: MAX_PRODUCT_VARIANTS }),
      )
    }
    setDrafts(current => [...current, { id: crypto.randomUUID(), label: "", image_url: imgUrl[0], priceInput: "", quantityInput: "0" }])
  }, [drafts.length, imgUrl, t, toast])

  // 2. Resolve drafts → persistable variants (label required; broken image falls back to first product image)
  const handleSave = useCallback(async () => {
    const resolved: TProductVariant[] = drafts
      .map(draft => {
        const label = draft.label.trim()
        const image_url = imgUrl.includes(draft.image_url) ? draft.image_url : imgUrl[0]
        const parsedPrice = parseFormattedNumber(draft.priceInput)
        const variantPrice = Number.isFinite(parsedPrice) && parsedPrice > 0 ? parsedPrice : price
        const parsedQuantity = parseFormattedNumber(draft.quantityInput)
        const variantQuantity = Number.isFinite(parsedQuantity) && parsedQuantity > 0 ? Math.floor(parsedQuantity) : 0
        if (!label || !image_url) return null
        return { id: draft.id, label, image_url, price: variantPrice, quantity: variantQuantity }
      })
      .filter((variant): variant is TProductVariant => Boolean(variant))

    if (drafts.length && resolved.length !== drafts.length) {
      return toast.show("warning", t("variant_label"), t("manage_variant_label_required"))
    }

    setIsLoading(true)
    try {
      const response = await productsSDK.updateProduct({ productId: id, variants: resolved.length ? resolved : null })
      if (typeof response === "string") throw new Error(response)
      replaceProduct(id, response.product)
      setDrafts(toDrafts(response.product.variants ?? null))
      toast.show("success", t("changes_saved"), t("manage_product_success"), 3000)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      toast.show("error", t("manage_product_error"), errorMessage)
    } finally {
      setIsLoading(false)
    }
  }, [drafts, id, imgUrl, price, replaceProduct, setIsLoading, t, toast])

  // 3. Without product images there is nothing to attach a variant to
  if (!imgUrl.length) return null

  return (
    <section className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-subTitle">{t("variant")}</p>
        <button
          type="button"
          onClick={addDraft}
          disabled={isLoading}
          className="inline-flex items-center gap-1 rounded border border-border-color/35 bg-background/55 px-2 py-1 text-[11px] font-medium text-icon-color transition-colors duration-150 hover:bg-foreground/50 disabled:opacity-40">
          <BiPlus size={14} /> {t("add_variant_action")}
        </button>
      </div>

      {!drafts.length ? (
        <div className="rounded border border-border-color/35 bg-background/35 px-4 py-5 text-center text-subTitle">
          {t("manage_variant_empty")}
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {drafts.map(draft => {
            // 4. A variant whose image is no longer in the gallery is flagged — this is the bug users hit
            const isImageMissing = !imgUrl.includes(draft.image_url)
            // Sold out when the typed quantity resolves to 0 — surfaced as a badge so the owner sees it at a glance
            const isSoldOut = !(parseFormattedNumber(draft.quantityInput) > 0)
            return (
              <div
                key={draft.id}
                className={twMerge(
                  "rounded border bg-foreground/5 p-2",
                  isImageMissing ? "border-warning/40" : "border-border-color/35",
                )}>
                <div className="flex flex-col gap-2 tablet:flex-row">
                  <div className="flex min-w-0 flex-1 flex-col gap-2">
                    <div className="flex items-center gap-2">
                      <BaseInput
                        className="min-w-0 flex-1"
                        value={draft.label}
                        onChange={event => updateDraft(draft.id, { label: event.target.value })}
                        disabled={isLoading}
                        placeholder={t("variant_label")}
                      />
                      {isSoldOut && (
                        <span className="shrink-0 rounded border border-warning/30 bg-warning/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.14em] text-warning">
                          {t("out_of_stock_label")}
                        </span>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <BaseInput
                        className="min-w-0 flex-1"
                        value={draft.priceInput}
                        onChange={event => updateDraft(draft.id, { priceInput: formatGroupedNumberInput(event.target.value) })}
                        disabled={isLoading}
                        inputMode="decimal"
                        placeholder={t("variant_price")}
                      />
                      <BaseInput
                        className="min-w-0 flex-1"
                        value={draft.quantityInput}
                        onChange={event => updateDraft(draft.id, { quantityInput: formatGroupedNumberInput(event.target.value) })}
                        disabled={isLoading}
                        inputMode="numeric"
                        placeholder={t("variant_quantity")}
                      />
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeDraft(draft.id)}
                    disabled={isLoading}
                    title={t("remove")}
                    className="inline-flex h-8 w-8 shrink-0 items-center justify-center self-start rounded border border-border-color/35 bg-background/55 text-danger transition-colors duration-150 hover:bg-danger/10 disabled:opacity-40">
                    <BiTrash size={14} />
                  </button>
                </div>

                {/* 5. Image picker — choose which current product image this variant uses */}
                <div className="mt-2">
                  <p className="mb-1 text-[10px] font-medium uppercase tracking-[0.16em] text-subTitle">
                    {t("selected_variant")}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {imgUrl.map((url, index) => {
                      const isActive = url === draft.image_url
                      return (
                        <button
                          key={`${url}-${index}`}
                          type="button"
                          onClick={() => updateDraft(draft.id, { image_url: url })}
                          disabled={isLoading}
                          className={twMerge(
                            "relative h-12 w-12 shrink-0 overflow-hidden rounded border transition-colors duration-150",
                            isActive ? "border-brand/60 ring-1 ring-brand/40" : "border-border-color/30 hover:border-brand/40",
                          )}>
                          <Image className="object-cover" src={url} alt={`variant-image-${index + 1}`} fill sizes="48px" />
                        </button>
                      )
                    })}
                  </div>
                  {isImageMissing && <p className="mt-1 text-[11px] text-warning">{t("manage_variant_help")}</p>}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {isDirty && (
        <Button
          className="self-end font-medium"
          type="button"
          onClick={handleSave}
          disabled={isLoading}
          variant="success-outline"
          size="md"
          rounded="lg"
          shadow="sm"
          rightIcon={<FiSave className="text-sm" />}>
          {isLoading ? t("saving_changes") : t("save_changes")}
        </Button>
      )}
    </section>
  )
}
