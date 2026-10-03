"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { FiSave, FiTrash2 } from "react-icons/fi"
import { twMerge } from "tailwind-merge"
import { AnimatePresence, motion } from "framer-motion"

import { IFormDataAddProduct } from "@/ts/product/IFormDataAddProduct"
import { TProductVariant, TProductVariantDraft } from "@/ts/product/TProductVariant"
import { TProductDB } from "@/ts/product/TProductDB"
import { expandVariantOptionValues, getVariantGroupLabel, getVariantGroupOptions, groupVariantDrafts, toVariantOptionValues, updateVariantGroupOptions } from "@/utils/variantOptions"
import { formatCurrency } from "@/utils/currencyFormatter"
import { formatGroupedNumberInput, parseFormattedNumber } from "@/utils/numberFormatter"
import { productsSDK } from "@/sdk/ProductsSDK/ProductsSDK"
import { useCurrentLocale, useScopedI18n } from "@/locales/client"
import useToast from "@/store/ui/useToast"
import { Button } from "@/components/ui"
import { FormatImagesForm } from "@/components/ui/Modals/AdminPanel/components/FormatImagesForm"
import { MAX_PRODUCT_VARIANTS } from "@/constants/uploadLimits"
import { PersonalizationForm } from "@/components/ui/Modals/AdminPanel/components/PersonalizationForm"
import { ProductInput } from "@/components/ui/Inputs/Validation"
import { VariantOptionsEditor } from "@/components/ui/VariantOptionsEditor"

interface ManageProductViewProps {
  product: TProductDB
}

const inputCn =
  "halloween-field w-full rounded-2xl border border-white/25 !bg-[#0f1318] px-4 text-[15px] text-white placeholder:text-white/55 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] outline-none transition-all focus:border-success focus:!bg-[#131922] focus:ring-2 focus:ring-success/60 disabled:opacity-50"

function normalizeVariantsForDraft(product: TProductDB): TProductVariantDraft[] {
  return (product.variants || []).map(variant => ({
    id: variant.id,
    label: variant.label,
    // -1 keeps "this variant has no image of its own" distinct from "it uses the first one"
    imageIndex: variant.image_url ? product.img_url.findIndex(image => image === variant.image_url) : -1,
    imageDataUrl: variant.image_url ?? null,
    options: toVariantOptionValues(variant.options),
    group_id: variant.group_id,
    price: variant.price > 0 ? variant.price : product.price,
    quantity: variant.quantity,
  }))
}

function stringifyValue(value: unknown) {
  return JSON.stringify(value ?? null)
}

async function postProductUpdate(request: API.ProductsUpdateRequest) {
  return productsSDK.updateProduct(request)
}

// http://localhost:6006/?path=/story/commerce-catalog--search-form
export function ManageProductView({ product }: ManageProductViewProps) {
  const t = useScopedI18n("product")
  const locale = useCurrentLocale()
  const router = useRouter()
  const toast = useToast()
  const currentTranslation = product.translations[locale] ?? product.translations.fi

  const [selectedImageIndex, setSelectedImageIndex] = useState(0)
  const [previewImageIndex, setPreviewImageIndex] = useState(0)
  const [previousPreviewIndex, setPreviousPreviewIndex] = useState(0)
  const slideDirection = previewImageIndex >= previousPreviewIndex ? "next" : "prev"
  const [variantLabelValue, setVariantLabelValue] = useState("")
  const [variantPriceValue, setVariantPriceValue] = useState("")
  const [variants, setVariants] = useState<TProductVariantDraft[]>(() => normalizeVariantsForDraft(product))
  const [isUpdatingProduct, setIsUpdatingProduct] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors, isDirty: hasFormChanges },
  } = useForm<IFormDataAddProduct>({
    defaultValues: {
      title: currentTranslation.title,
      subTitle: currentTranslation.description,
      onStock: product.on_stock,
    },
  })

  const hasVariantChanges = stringifyValue(variants) !== stringifyValue(normalizeVariantsForDraft(product))
  const hasChanges = hasFormChanges || hasVariantChanges

  const previewPrice = variants[0]?.price > 0 ? formatCurrency(variants[0].price) : formatCurrency(product.price)

  const addVariant = useCallback(() => {
    const normalizedLabel = variantLabelValue.trim()
    const normalizedPrice = parseFormattedNumber(variantPriceValue)

    if (!normalizedLabel) {
      return toast.show("warning", t("variant_label"), t("manage_variant_label_required"))
    }

    if (!Number.isFinite(normalizedPrice) || normalizedPrice <= 0) {
      return toast.show("warning", t("variant_price"), t("manage_variant_price_required"))
    }

    if (variants.length >= MAX_PRODUCT_VARIANTS) {
      return toast.show(
        "warning",
        t("warning.max_variants_title", { maxVariants: MAX_PRODUCT_VARIANTS }),
        t("warning.max_variants_subtitle", { maxVariants: MAX_PRODUCT_VARIANTS }),
      )
    }

    const id = crypto.randomUUID()
    setVariants(currentVariants => [
      ...currentVariants,
      {
        id,
        label: normalizedLabel,
        // A new variant starts with no image - "Assign current image" attaches one when it helps
        imageIndex: -1,
        imageDataUrl: null,
        options: {},
        group_id: id,
        price: normalizedPrice,
        quantity: 0, // new variants start sold out; owner sets stock per row below
      },
    ])
    setVariantLabelValue("")
    setVariantPriceValue("")
  }, [t, toast, variantLabelValue, variantPriceValue, variants.length])

  const updateVariantLabel = useCallback((groupId: string, nextLabel: string) => {
    setVariants(currentVariants =>
      currentVariants.map(variant => ((variant.group_id ?? variant.id) === groupId ? { ...variant, label: nextLabel } : variant)),
    )
  }, [])

  const updateVariantPrice = useCallback((variantId: string, nextPrice: string) => {
    const normalizedPrice = parseFormattedNumber(nextPrice)

    setVariants(currentVariants =>
      currentVariants.map(variant =>
        variant.id === variantId
          ? {
              ...variant,
              price: Number.isFinite(normalizedPrice) && normalizedPrice > 0 ? normalizedPrice : 0,
            }
          : variant,
      ),
    )
  }, [])

  const updateVariantQuantity = useCallback((variantId: string, nextQuantity: string) => {
    const normalizedQuantity = parseFormattedNumber(nextQuantity)

    setVariants(currentVariants =>
      currentVariants.map(variant =>
        variant.id === variantId
          ? {
              ...variant,
              quantity: Number.isFinite(normalizedQuantity) && normalizedQuantity > 0 ? Math.floor(normalizedQuantity) : 0,
            }
          : variant,
      ),
    )
  }, [])

  const assignFirstImageToVariant = useCallback(
    (groupId: string) => {
      const firstImageUrl = product.img_url[0]
      if (!firstImageUrl) return

      setVariants(currentVariants =>
        currentVariants.map(variant =>
          (variant.group_id ?? variant.id) === groupId
            ? {
                ...variant,
                imageIndex: 0,
                imageDataUrl: firstImageUrl,
              }
            : variant,
        ),
      )
    },
    [product.img_url],
  )

  const clearVariantImage = useCallback((groupId: string) => {
    setVariants(currentVariants =>
      currentVariants.map(variant => ((variant.group_id ?? variant.id) === groupId ? { ...variant, imageIndex: -1, imageDataUrl: null } : variant)),
    )
  }, [])

  const removeVariant = useCallback((groupId: string) => {
    setVariants(currentVariants => currentVariants.filter(variant => (variant.group_id ?? variant.id) !== groupId))
  }, [])

  // An image the gallery no longer holds becomes null rather than falling back to the first photo -
  // the fallback belongs at render time, so replacing the photos later fixes every imageless variant.
  const buildResolvedVariants = useCallback(() => {
    return groupVariantDrafts(variants).flatMap(group => group.flatMap((variant): TProductVariant[] => {
      const label = getVariantGroupLabel(group).trim()
      if (!label) return []
      return [{
        id: variant.id,
        label,
        image_url: product.img_url.find(url => url === variant.imageDataUrl) ?? null,
        options: expandVariantOptionValues(variant.options ?? {})[0],
        group_id: variant.group_id,
        price: variant.price > 0 ? variant.price : product.price,
        quantity: variant.quantity > 0 ? Math.floor(variant.quantity) : 0,
      }]
    }))
  }, [product.img_url, product.price, variants])

  // Held in refs so other hooks below can call the latest version without listing these
  // useCallback-created functions in their own deps arrays.
  const updateVariantLabelRef = useRef(updateVariantLabel)
  const updateVariantPriceRef = useRef(updateVariantPrice)
  const updateVariantQuantityRef = useRef(updateVariantQuantity)
  const assignFirstImageToVariantRef = useRef(assignFirstImageToVariant)
  const clearVariantImageRef = useRef(clearVariantImage)
  const removeVariantRef = useRef(removeVariant)
  const buildResolvedVariantsRef = useRef(buildResolvedVariants)
  useEffect(() => {
    updateVariantLabelRef.current = updateVariantLabel
    updateVariantPriceRef.current = updateVariantPrice
    updateVariantQuantityRef.current = updateVariantQuantity
    assignFirstImageToVariantRef.current = assignFirstImageToVariant
    clearVariantImageRef.current = clearVariantImage
    removeVariantRef.current = removeVariant
    buildResolvedVariantsRef.current = buildResolvedVariants
  })

  const onSubmit = useCallback(
    async (data: IFormDataAddProduct) => {
      if (!product.img_url.length) {
        return toast.show("warning", t("manage_upload_image_first_title"), t("manage_upload_image_first_subtitle"))
      }

      if (!variants.length) {
        return toast.show("warning", t("variant"), t("manage_variant_empty"))
      }

      setIsUpdatingProduct(true)

      try {
        const resolvedVariants = buildResolvedVariantsRef.current()
        if (resolvedVariants.length > MAX_PRODUCT_VARIANTS) {
          toast.show(
            "warning",
            t("warning.max_variants_title", { maxVariants: MAX_PRODUCT_VARIANTS }),
            t("warning.max_variants_subtitle", { maxVariants: MAX_PRODUCT_VARIANTS }),
          )
          return
        }
        const normalizedTitle = data.title.trim()
        const normalizedSubTitle = data.subTitle.trim()
        const normalizedPrice = resolvedVariants[0]?.price

        if (!normalizedPrice || normalizedPrice <= 0) {
          throw new Error(t("manage_variant_empty"))
        }

        const nextTranslations = {
          ...product.translations,
          [locale]: {
            ...(product.translations[locale] ?? product.translations.fi),
            title: normalizedTitle,
            description: normalizedSubTitle,
          },
        }

        let nextProductId = product.id

        if (stringifyValue(nextTranslations) !== stringifyValue(product.translations)) {
          await postProductUpdate({ productId: nextProductId, translations: nextTranslations })
        }

        // Updating variants recomputes on_stock server-side (sum of variant quantities) — no separate stock update
        if (stringifyValue(resolvedVariants) !== stringifyValue(product.variants ?? null)) {
          await postProductUpdate({ productId: nextProductId, variants: resolvedVariants })
        }

        if (normalizedPrice !== product.price) {
          const responseData = await postProductUpdate({ productId: nextProductId, price: normalizedPrice })
          nextProductId = responseData.product?.id || nextProductId
        }

        setVariants(resolvedVariants.map(variant => ({
          id: variant.id,
          label: variant.label,
          imageIndex: variant.image_url ? product.img_url.indexOf(variant.image_url) : -1,
          imageDataUrl: variant.image_url ?? null,
          options: toVariantOptionValues(variant.options),
          group_id: variant.group_id,
          price: variant.price,
          quantity: variant.quantity,
        })))
        toast.show("success", t("changes_saved"), t("manage_product_success"))

        if (nextProductId !== product.id) {
          router.replace(`/${locale}/products/${nextProductId}/manage`)
          router.refresh()
          return
        }

        router.refresh()
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error)
        toast.show("error", t("manage_product_error"), errorMessage)
      } finally {
        setIsUpdatingProduct(false)
      }
    },
    [
      locale,
      product.id,
      product.img_url,
      product.price,
      product.translations,
      product.variants,
      router,
      t,
      toast,
      variants.length,
    ],
  )

  const deleteProduct = useCallback(async () => {
    if (!window.confirm(t("confirm_delete_product"))) return

    setIsUpdatingProduct(true)
    try {
      await productsSDK.deleteProduct({ id: product.id })

      toast.show("success", t("product_deleted"), currentTranslation.title)
      router.push(`/${locale}`)
      router.refresh()
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      toast.show("error", t("manage_product_error"), errorMessage)
    } finally {
      setIsUpdatingProduct(false)
    }
  }, [currentTranslation.title, locale, product.id, router, t, toast])

  const variantCards = useMemo(
    () =>
      groupVariantDrafts(variants).map(group => {
        const variant = group[0]
        const groupId = variant.group_id ?? variant.id
        const groupLabel = getVariantGroupLabel(group)
        const groupOptions = getVariantGroupOptions(group)
        const optionNames = Object.keys(groupOptions)
        const translatedOptionNames: Record<string, string> = {
          Size: t("variant_size"), Color: t("variant_color"), Weight: t("variant_weight"),
        }
        const parameterHeading = optionNames.length === 1
          ? translatedOptionNames[optionNames[0]] ?? optionNames[0]
          : t("variant_parameter")
        const linkedImageUrl = product.img_url.find(url => url === variant.imageDataUrl) ?? null

        return (
          <div
            className="halloween-panel min-w-0 rounded-2xl border border-white/20 bg-[linear-gradient(180deg,rgba(14,18,24,0.96),rgba(9,11,15,0.98))] p-3 shadow-[0_14px_40px_rgba(0,0,0,0.2)]"
            key={groupId}>
            <div className="flex items-center gap-3">
              <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-white/10 bg-black">
                {linkedImageUrl ? (
                  <Image className="object-cover" src={linkedImageUrl} alt={groupLabel} fill sizes="64px" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-[10px] text-white/35">{t("variant")}</div>
                )}
              </div>

              <input
                className="halloween-field min-w-0 flex-1 rounded-xl border border-white/30 bg-[#0f1318] px-3 py-2 text-sm text-white outline-none transition-all focus:border-success focus:ring-2 focus:ring-success/70"
                value={groupLabel}
                onChange={event => updateVariantLabelRef.current(groupId, event.target.value)}
                placeholder={t("variant_label")}
                disabled={isUpdatingProduct}
              />
            </div>

            <div className="mt-3 grid min-w-0 grid-cols-[minmax(0,1fr)] gap-3">
                <VariantOptionsEditor
                  variantLabel={groupLabel}
                  options={groupOptions}
                  onChange={options => {
                    const nextCount = variants.length - group.length + expandVariantOptionValues(options).length
                    if (nextCount > MAX_PRODUCT_VARIANTS) {
                      toast.show("warning", t("warning.max_variants_title", { maxVariants: MAX_PRODUCT_VARIANTS }), t("warning.max_variants_subtitle", { maxVariants: MAX_PRODUCT_VARIANTS }))
                      return
                    }
                    setVariants(current => updateVariantGroupOptions(current, groupId, options))
                  }}
                  disabled={isUpdatingProduct}
                />

                <div className="halloween-table overflow-hidden rounded-xl border border-white/25 bg-[#0d1116]">
                  <div className="grid grid-cols-[minmax(72px,1fr)_minmax(0,1.2fr)_minmax(0,1.2fr)] items-center gap-2 bg-white/[0.10] px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-white/90">
                    <span>{parameterHeading}</span>
                    <span>{t("price")}</span>
                    <span>{t("on_stock")}</span>
                  </div>
                  {group.map(row => {
                    const rowOptions = Object.entries(row.options ?? {})
                    const rowLabel = rowOptions.length === 1
                      ? rowOptions[0][1][0]
                      : rowOptions.map(([name, values]) => `${name}: ${values[0]}`).join(" / ") || groupLabel
                    return (
                      <div className="grid grid-cols-[minmax(72px,1fr)_minmax(0,1.2fr)_minmax(0,1.2fr)] items-center gap-2 border-t border-white/20 px-3 py-2" key={row.id}>
                        <span className="min-w-0 break-words text-sm font-medium text-title">{rowLabel}</span>
                        <input
                          className="halloween-field w-full min-w-0 rounded-lg border border-white/25 bg-[#111820] px-1.5 py-2 text-xs text-white outline-none transition-all focus:border-success focus:ring-2 focus:ring-success/70 mobile:px-2.5 mobile:text-sm"
                          aria-label={`${groupLabel} ${rowLabel} ${t("variant_price")}`}
                          value={row.price > 0 ? formatGroupedNumberInput(String(row.price)) : ""}
                          onChange={event => updateVariantPriceRef.current(row.id, event.target.value)}
                          placeholder={t("price")}
                          disabled={isUpdatingProduct}
                          inputMode="decimal"
                        />
                        <input
                          className={twMerge(
                            "halloween-field w-full min-w-0 rounded-lg border bg-[#111820] px-1.5 py-2 text-xs text-white outline-none transition-all focus:border-success focus:ring-2 focus:ring-success/70 mobile:px-2.5 mobile:text-sm",
                            row.quantity > 0 ? "border-white/25" : "border-warning/70",
                          )}
                          aria-label={`${groupLabel} ${rowLabel} ${t("variant_quantity")}`}
                          value={formatGroupedNumberInput(String(row.quantity))}
                          onChange={event => updateVariantQuantityRef.current(row.id, event.target.value)}
                          disabled={isUpdatingProduct}
                          inputMode="numeric"
                        />
                      </div>
                    )
                  })}
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    className="rounded-xl border border-success/20 bg-success/8 px-3 py-2 text-xs font-medium text-success transition-colors hover:bg-success/12"
                    type="button"
                    onClick={() => assignFirstImageToVariantRef.current(groupId)}>
                    {t("assign_current_image")}
                  </button>
                  {linkedImageUrl && (
                    <button
                      className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-medium text-white/60 transition-colors hover:bg-white/[0.07]"
                      type="button"
                      onClick={() => clearVariantImageRef.current(groupId)}>
                      {t("variant_no_image")}
                    </button>
                  )}
                  <button
                    className="rounded-xl border border-danger/20 bg-danger/8 px-3 py-2 text-xs font-medium text-danger transition-colors hover:bg-danger/12"
                    type="button"
                    onClick={() => removeVariantRef.current(groupId)}>
                    {t("remove")}
                  </button>
                </div>

                {/* The print area is measured against the linked photo, so a variant showing another
                    variant's photo makes the buyer's preview lie about what gets printed */}
                <p className="text-[11px] text-subTitle">{t("variant_image_matches_hint")}</p>
            </div>
          </div>
        )
      }),
    [isUpdatingProduct, product.img_url, t, toast, variants],
  )

  return (
    <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-6 laptop:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
      <section className="halloween-panel rounded-2xl border border-white/8 bg-[linear-gradient(145deg,rgba(12,16,21,0.98),rgba(8,10,14,0.99))] p-5 shadow-[0_22px_70px_rgba(0,0,0,0.34)]">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-white/70">{t("manage_images")}</p>
        {product.img_url.length > 0 && (
          <div className="relative mt-3 aspect-[4/3] w-full overflow-hidden rounded-xl border border-white/8 bg-black">
            <AnimatePresence
              initial={false}
              mode="popLayout"
              custom={slideDirection}
              onExitComplete={() => setPreviousPreviewIndex(previewImageIndex)}>
              <motion.div
                className="absolute inset-0"
                key={previewImageIndex}
                custom={slideDirection}
                variants={{
                  initial: (dir: "next" | "prev") => ({ x: dir === "next" ? "100%" : "-100%", opacity: 0 }),
                  animate: { x: "0%", opacity: 1 },
                  exit: (dir: "next" | "prev") => ({ x: dir === "next" ? "-100%" : "100%", opacity: 0 }),
                }}
                initial="initial"
                animate="animate"
                exit="exit"
                transition={{ duration: 0.35, ease: "easeInOut" }}>
                <Image
                  className="object-contain p-4"
                  src={product.img_url[previewImageIndex]}
                  alt={t("product_preview_alt")}
                  fill
                  sizes="(max-width: 1024px) 100vw, 50vw"
                  priority
                />
              </motion.div>
            </AnimatePresence>
          </div>
        )}
        <div className="mt-3">
          <FormatImagesForm
            id={product.id}
            title={product.translations.fi.title}
            imgUrl={product.img_url}
            selectedIndex={selectedImageIndex}
            onSelect={index => {
              setSelectedImageIndex(index)
              setPreviewImageIndex(index)
            }}
            onHover={setPreviewImageIndex}
          />
        </div>
      </section>

      <form className="flex min-w-0 flex-col gap-4" onSubmit={event => handleSubmit(onSubmit)(event)}>
        <section className="halloween-panel rounded-2xl border border-white/8 bg-[radial-gradient(circle_at_top_left,rgba(20,90,44,0.22),transparent_28%),linear-gradient(155deg,rgba(11,14,19,0.99),rgba(8,10,14,1))] p-6 shadow-[0_24px_90px_rgba(0,0,0,0.42)]">
          <div className="mb-4">
            <p className="text-xs uppercase tracking-[0.24em] text-subTitle">{t("manage_product")}</p>
            <h1 className="mt-2 text-3xl font-semibold text-title">{t("manage_product_title")}</h1>
            <p className="mt-2 text-sm leading-6 text-subTitle">{t("manage_product_subtitle")}</p>
          </div>

          <div className="grid gap-4">
            <div className="grid gap-1.5">
              <label className="px-0.5 text-[11px] font-semibold uppercase tracking-widest text-white/70">{t("title")}</label>
              <ProductInput
                className={twMerge(inputCn, "h-12")}
                id="title"
                register={register}
                errors={errors}
                disabled={isUpdatingProduct}
                required
                placeholder={t("placeholder.title")}
              />
            </div>

            <div className="grid gap-1.5">
              <label className="px-0.5 text-[11px] font-semibold uppercase tracking-widest text-white/70">
                {t("description")}
              </label>
              <ProductInput
                className={twMerge(inputCn, "min-h-[120px] resize-none py-3 leading-6")}
                id="subTitle"
                register={register}
                errors={errors}
                disabled={isUpdatingProduct}
                placeholder={t("placeholder.description")}
              />
            </div>

            <div className="grid items-end gap-4 mobile:grid-cols-2">
              {/* Stock is the accumulated stock of all variants (read-only) — edit it per variant above */}
              <div className="h-12 flex items-center justify-between rounded-2xl border border-white/8 bg-white/[0.04] px-4">
                <p className="text-xs uppercase tracking-[0.2em] text-subTitle">{t("on_stock")}</p>
                <p className="text-lg font-semibold text-white/80">
                  {formatGroupedNumberInput(String(variants.reduce((sum, variant) => sum + variant.quantity, 0)))}
                </p>
              </div>

              <div className="h-12 flex items-center justify-between rounded-2xl border border-success/18 bg-success/8 px-4">
                <p className="text-xs uppercase tracking-[0.2em] text-subTitle">{t("price")}</p>
                <p className="text-lg font-semibold text-success">{previewPrice}</p>
              </div>
            </div>
          </div>
        </section>

        <section className="halloween-panel rounded-2xl border border-white/8 bg-[linear-gradient(180deg,rgba(10,13,18,0.98),rgba(7,9,13,0.99))] p-6 shadow-[0_18px_60px_rgba(0,0,0,0.28)]">
          <div className="flex flex-col gap-3">
            <div className="grid items-end gap-3 mobile:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
              <label className="grid gap-1.5">
                <span className="px-0.5 text-[11px] font-semibold uppercase tracking-widest text-white/70">
                  {t("variant_label")}
                </span>
                <input
                  className={twMerge(inputCn, "h-12")}
                  value={variantLabelValue}
                  onChange={event => setVariantLabelValue(event.target.value)}
                  placeholder={t("variant_label")}
                  disabled={isUpdatingProduct}
                />
              </label>

              <label className="grid gap-1.5">
                <span className="px-0.5 text-[11px] font-semibold uppercase tracking-widest text-white/70">
                  {t("variant_price")}
                </span>
                <input
                  className={twMerge(inputCn, "h-12")}
                  value={variantPriceValue}
                  onChange={event => setVariantPriceValue(formatGroupedNumberInput(event.target.value))}
                  placeholder={t("placeholder.price")}
                  disabled={isUpdatingProduct}
                  inputMode="decimal"
                />
              </label>

              <Button
                className="font-medium"
                type="button"
                onClick={addVariant}
                disabled={isUpdatingProduct}
                variant="success-outline"
                size="lg"
                rounded="lg"
                shadow="sm">
                {t("add_variant_action")}
              </Button>
            </div>

            {!variants.length && <p className="text-sm text-subTitle">{t("manage_variant_help")}</p>}
          </div>

          <div className="mt-4 grid min-w-0 grid-cols-[minmax(0,1fr)] gap-3">
            {variantCards.length ? variantCards : <p className="text-sm text-subTitle">{t("manage_variant_empty")}</p>}
          </div>
        </section>

        {/* Own section with its own update button - the print area is not part of the title/price form */}
        <PersonalizationForm imageUrls={product.img_url} productId={product.id} personalization={product.personalization} />

        <section className="halloween-panel rounded-2xl border border-white/8 bg-[linear-gradient(180deg,rgba(10,13,18,0.98),rgba(7,9,13,0.99))] p-6 shadow-[0_18px_60px_rgba(0,0,0,0.28)]">
          <div className="flex flex-wrap gap-3">
            <Button
              className="font-medium"
              type="button"
              onClick={deleteProduct}
              disabled={isUpdatingProduct}
              variant="danger-outline"
              size="lg"
              rounded="lg"
              shadow="sm"
              rightIcon={<FiTrash2 className="text-base" />}>
              {t("delete")}
            </Button>

            <Button
              className="font-medium mobile:ml-auto"
              type="submit"
              disabled={isUpdatingProduct || !hasChanges}
              variant="success"
              size="lg"
              rounded="lg"
              shadow="sm"
              rightIcon={<FiSave className="text-base" />}>
              {isUpdatingProduct ? t("saving_changes") : t("save_changes")}
            </Button>
          </div>
        </section>
      </form>
    </div>
  )
}
