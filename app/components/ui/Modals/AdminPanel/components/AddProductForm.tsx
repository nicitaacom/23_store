"use client"

import { useEffect, useRef, useState } from "react"
import Image from "next/image"
import { AnimatePresence, motion } from "framer-motion"
import { useForm } from "react-hook-form"
import { twMerge } from "tailwind-merge"
import { ImageListType } from "react-images-uploading"
import ImageUploading from "react-images-uploading"
import { FaAngleLeft, FaAngleRight } from "react-icons/fa"

import { IFormDataAddProduct } from "@/ts/product/IFormDataAddProduct"
import { ProductInput } from "@/components/ui/Inputs/Validation"
import { Button } from "@/components/ui/Button"
import useDragging from "@/hooks/ui/useDragging"
import useToast from "@/store/ui/useToast"
import { useOwnerProductsStore } from "@/store/user/ownerProductsStore"
import { TProductVariantDraft } from "@/ts/product/TProductVariant"
import { formatCurrency } from "@/utils/currencyFormatter"
import { getUserId } from "@/utils/getUserId"
import { formatGroupedNumberInput, parseFormattedNumber } from "@/utils/numberFormatter"
import { createRawProductTranslations, normalizeProductImageUrls } from "@/utils/product"
import { showToastWarningFn } from "../functions/showToastWarningFn"
import { createProductFn } from "@/functions/createProductFn"
import { useI18n, useScopedI18n } from "@/locales/client"
import { MAX_IMAGE_FILE_SIZE_BYTES, MAX_PRODUCT_IMAGES, MAX_PRODUCT_VARIANTS, MIN_IMAGE_RESOLUTION } from "@/constants/uploadLimits"
import { TProductDB } from "@/ts/product/TProductDB"
import { productsSDK } from "@/sdk/ProductsSDK/ProductsSDK"

const previewImageVariants = {
  initial: (direction: "next" | "prev") => ({
    x: direction === "next" ? "100%" : "-100%",
    opacity: 0,
  }),
  animate: {
    opacity: 1,
    x: "0%",
  },
  exit: (direction: "next" | "prev") => ({
    x: direction === "next" ? "-100%" : "100%",
    opacity: 0,
  }),
}

const MAX_DESCRIPTION_LENGTH = 7200
const BEFORE_UNLOAD_MESSAGE = "Translation in progress, are you sure you want to leave?"

interface AddProductFormProps {
  onCreated?: () => void
}

export function AddProductForm({ onCreated }: AddProductFormProps) {
  const t = useScopedI18n("product")
  const tGlobal = useI18n()
  const { show: showToast, close: closeToast } = useToast()
  const { isDraggingg } = useDragging()

  const [images, setImages] = useState<ImageListType>([])
  const [variantLabel, setVariantLabel] = useState("")
  const [variants, setVariants] = useState<TProductVariantDraft[]>([])
  const [activeImageIndex, setActiveImageIndex] = useState(0)
  const [pendingTranslationsAmount, setPendingTranslationsAmount] = useState(0)
  const dragZone = useRef<HTMLButtonElement | null>(null)
  const previousImageIndexRef = useRef(0)
  const pendingTranslationsAmountRef = useRef(0)

  const onChange = (imageList: ImageListType) => {
    setImages(imageList)
    setActiveImageIndex(current => {
      if (imageList.length === 0) return 0
      return Math.min(current, imageList.length - 1)
    })
  }

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<IFormDataAddProduct>()

  const titleValue = watch("title")
  const descriptionValue = watch("subTitle")
  const priceValue = watch("price")
  const onStockValue = watch("onStock")

  const previewTitle = titleValue?.trim() || t("placeholder.title")
  const previewDescription = descriptionValue?.trim() || t("placeholder.description")

  const numericPrice = typeof priceValue === "number" ? priceValue : Number(priceValue)
  const previewPrice = Number.isFinite(numericPrice) && numericPrice > 0 ? formatCurrency(numericPrice) : "--"

  const onStockInputValue =
    typeof onStockValue === "string" ? onStockValue : typeof onStockValue === "number" ? String(onStockValue) : ""
  const numericOnStock = parseFormattedNumber(onStockInputValue)
  const previewStock = onStockInputValue.trim()
    ? formatGroupedNumberInput(onStockInputValue)
    : Number.isFinite(numericOnStock) && numericOnStock >= 0
      ? formatGroupedNumberInput(String(numericOnStock))
      : "--"

  // Shared className applied to every ProductInput — guarantees identical backgrounds
  const inputCn =
    "w-full rounded-2xl border border-white/10 !bg-white/[0.04] px-4 text-[15px] text-white placeholder:text-white/25 shadow-none transition-colors focus:border-white/20 focus:!bg-white/[0.06] disabled:opacity-50"
  const isLoading = false

  const updateBackgroundToast = (nextPendingTranslationsAmount: number) => {
    if (nextPendingTranslationsAmount <= 0) {
      closeToast()
      return
    }

    const pendingProductsLabel = nextPendingTranslationsAmount === 1 ? "1 product is processing." : `${nextPendingTranslationsAmount} products are processing.`
    showToast(
      "success",
      "Creating product, translating...",
      `${pendingProductsLabel} You can create another product while AI finishes translation.`,
      null,
    )
  }

  const increasePendingTranslations = () => {
    const nextPendingTranslationsAmount = pendingTranslationsAmountRef.current + 1
    pendingTranslationsAmountRef.current = nextPendingTranslationsAmount
    setPendingTranslationsAmount(nextPendingTranslationsAmount)
    updateBackgroundToast(nextPendingTranslationsAmount)
  }

  const decreasePendingTranslations = (showCompletedToast = false) => {
    const nextPendingTranslationsAmount = Math.max(0, pendingTranslationsAmountRef.current - 1)
    pendingTranslationsAmountRef.current = nextPendingTranslationsAmount
    setPendingTranslationsAmount(nextPendingTranslationsAmount)

    if (nextPendingTranslationsAmount > 0) {
      updateBackgroundToast(nextPendingTranslationsAmount)
    } else if (showCompletedToast) {
      showToast("success", "Product created", "AI translation completed.")
    } else {
      closeToast()
    }
  }

  const rollbackOptimisticProduct = (optimisticProductId: string, errorMessage: string) => {
    const { removeProduct, setError } = useOwnerProductsStore.getState()

    removeProduct(optimisticProductId)
    setError(errorMessage)
  }

  const createProductInBackgroundFn = async ({
    optimisticProductId,
    normalizedTitle,
    normalizedDescription,
    price,
    formattedOnStock,
    submitImages,
    resolvedVariants,
  }: {
    optimisticProductId: string
    normalizedTitle: string
    normalizedDescription: string
    price: number
    formattedOnStock: number
    submitImages: ImageListType
    resolvedVariants: TProductVariantDraft[]
  }) => {
    try {
      const translations = await productsSDK.translateProduct({
        title: normalizedTitle,
        description: normalizedDescription,
      })

      useOwnerProductsStore.getState().updateProduct(optimisticProductId, product => ({
        ...product,
        translations,
      }))

      const createdProduct = await createProductFn(t, {
        title: normalizedTitle,
        description: normalizedDescription,
        price,
        onStock: formattedOnStock,
        images: submitImages,
        variants: resolvedVariants,
        translations,
        manageLoading: false,
      })

      useOwnerProductsStore.getState().replaceProduct(optimisticProductId, createdProduct)
      useOwnerProductsStore.getState().setError(null)
      decreasePendingTranslations(true)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)

      rollbackOptimisticProduct(optimisticProductId, errorMessage)
      decreasePendingTranslations(false)
      showToast("error", "Failed to create product", errorMessage)
    }
  }

  const onSubmit = async (data: IFormDataAddProduct) => {
    const normalizedTitle = data.title.trim()
    const normalizedDescription = data.subTitle.trim()

    const formattedOnStock = parseFormattedNumber(data.onStock)
    const resolvedVariants = variants
      .map(variant => ({
        ...variant,
        imageIndex: images.findIndex(image => image.data_url === variant.imageDataUrl),
      }))
      .filter(variant => variant.imageIndex >= 0)
    const optimisticVariants = resolvedVariants
      .map(variant => ({
        id: variant.id,
        label: variant.label.trim(),
        image_url: images[variant.imageIndex]?.data_url || "",
      }))
      .filter(variant => variant.label && variant.image_url)
    const optimisticImages = normalizeProductImageUrls(images.map(image => image.data_url || ""))
    const optimisticProductId = `optimistic-${crypto.randomUUID()}`
    const optimisticProduct: TProductDB = {
      id: optimisticProductId,
      price_id: optimisticProductId,
      owner_id: getUserId(),
      translations: createRawProductTranslations(normalizedTitle, normalizedDescription),
      price: Number(data.price) || 0,
      img_url: optimisticImages.length ? optimisticImages : ["/placeholder.jpg"],
      variants: optimisticVariants.length ? optimisticVariants : null,
      on_stock: formattedOnStock,
    }

    useOwnerProductsStore.getState().setError(null)
    useOwnerProductsStore.getState().addProduct(optimisticProduct)

    const submitImages = [...images]

    reset()
    setImages([])
    setVariantLabel("")
    setVariants([])
    setActiveImageIndex(0)
    previousImageIndexRef.current = 0
    onCreated?.()

    increasePendingTranslations()

    void createProductInBackgroundFn({
      optimisticProductId,
      normalizedTitle,
      normalizedDescription,
      price: data.price,
      formattedOnStock,
      submitImages,
      resolvedVariants,
    })
  }

  const navigateToImage = (nextIndex: number) => {
    setActiveImageIndex(currentIndex => (nextIndex === currentIndex ? currentIndex : nextIndex))
  }

  const makeImagePrimary = (imageIndex: number) => {
    if (imageIndex <= 0) return

    setImages(currentImages => {
      if (!currentImages[imageIndex]) return currentImages

      const nextImages = [...currentImages]
      const [selectedImage] = nextImages.splice(imageIndex, 1)

      if (!selectedImage) return currentImages

      nextImages.unshift(selectedImage)
      return nextImages
    })

    setActiveImageIndex(0)
  }

  const addVariant = () => {
    const normalizedLabel = variantLabel.trim()

    if (!images.length) {
      return showToast("warning", "Upload image first", "Select or upload an image before creating a variant")
    }

    if (variants.length >= MAX_PRODUCT_VARIANTS) {
      return showToast(
        "warning",
        t("warning.max_variants_title", { maxVariants: MAX_PRODUCT_VARIANTS }),
        t("warning.max_variants_subtitle", { maxVariants: MAX_PRODUCT_VARIANTS }),
      )
    }

    if (!normalizedLabel) {
      return showToast("warning", "Variant label required", "Enter a variant label like Bright Black Gray")
    }

    setVariants(currentVariants => [
      ...currentVariants,
      {
        id: crypto.randomUUID(),
        label: normalizedLabel,
        imageIndex: activeImageIndex,
        imageDataUrl: images[activeImageIndex]?.data_url || "",
      },
    ])
    setVariantLabel("")
  }

  const removeVariant = (variantId: string) => {
    setVariants(currentVariants => currentVariants.filter(variant => variant.id !== variantId))
  }

  useEffect(() => {
    previousImageIndexRef.current = activeImageIndex
  }, [activeImageIndex])

  useEffect(() => {
    if (pendingTranslationsAmount === 0) return

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault()
      event.returnValue = BEFORE_UNLOAD_MESSAGE
      return BEFORE_UNLOAD_MESSAGE
    }

    window.addEventListener("beforeunload", handleBeforeUnload)
    return () => window.removeEventListener("beforeunload", handleBeforeUnload)
  }, [pendingTranslationsAmount])

  return (
    <div className="mx-auto grid h-full min-h-0 w-full gap-3 tablet:grid-cols-[minmax(0,1fr)_minmax(0,1.45fr)]">
      {/* ── LEFT: Image Gallery only ── */}
      <ImageUploading
        multiple
        value={images}
        onChange={onChange}
        maxNumber={MAX_PRODUCT_IMAGES}
        maxFileSize={MAX_IMAGE_FILE_SIZE_BYTES}
        resolutionWidth={MIN_IMAGE_RESOLUTION.width}
        resolutionHeight={MIN_IMAGE_RESOLUTION.height}
        resolutionType="more"
        dataURLKey="data_url"
        onError={(errors, files) => {
          void showToastWarningFn(
            tGlobal,
            errors,
            {
              maxNumber: MAX_PRODUCT_IMAGES,
              maxFileSize: MAX_IMAGE_FILE_SIZE_BYTES,
              minResolution: MIN_IMAGE_RESOLUTION,
            },
            files,
          )
        }}>
        {({ imageList, onImageUpload, onImageRemoveAll, onImageUpdate, onImageRemove, isDragging, dragProps }) => {
          const safeActiveImageIndex = imageList[activeImageIndex] ? activeImageIndex : 0
          const activeImage = imageList[safeActiveImageIndex]
          const isPrimaryImage = safeActiveImageIndex === 0
          const hasPrevImage = safeActiveImageIndex > 0
          const hasNextImage = safeActiveImageIndex < imageList.length - 1
          const imageDirection = safeActiveImageIndex >= previousImageIndexRef.current ? "next" : "prev"

          return (
            <section className="panel-scroll flex min-h-0 flex-col gap-2 overflow-y-auto pb-1">
              {/* Upload trigger */}
              <button
                ref={dragZone}
                onClick={onImageUpload}
                disabled={isLoading}
                type="button"
                {...dragProps}
                className={twMerge(
                  "group flex shrink-0 flex-col items-center justify-center gap-1.5 rounded-2xl border border-dashed border-white/15 bg-white/[0.02] px-4 py-4 text-center transition-all duration-200",
                  "hover:border-[#1fe15a]/40 hover:bg-[#1fe15a]/[0.04]",
                  isDragging && "border-[#1fe15a]/60 bg-[#1fe15a]/[0.07]",
                  isDraggingg && "fixed inset-0 z-[101] rounded-none border-0 bg-[#0a0f15]/95",
                )}>
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/[0.05]">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path
                      d="M8 2v8M5 5l3-3 3 3"
                      stroke="#1fe15a"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M2 11v1a2 2 0 002 2h8a2 2 0 002-2v-1"
                      stroke="rgba(255,255,255,0.3)"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                    />
                  </svg>
                </div>
                <div>
                  <p className="text-xs font-medium text-white/80">
                    {isDragging ? t("drop_files_here") : t("click_or_drop_here")}
                  </p>
                  <p className="mt-0.5 text-[10px] text-white/35">{t("add_form.eyebrow")}</p>
                </div>
              </button>

              {/* 16:9 main preview — object-contain gives black bars for square images */}
              <div className="relative w-full shrink-0 overflow-hidden rounded-2xl bg-black" style={{ aspectRatio: "16/9" }}>
                {activeImage ? (
                  <>
                    <AnimatePresence initial={false} custom={imageDirection} mode="popLayout">
                      <motion.div
                        key={`${safeActiveImageIndex}-${activeImage.data_url}`}
                        custom={imageDirection}
                        variants={previewImageVariants}
                        initial="initial"
                        animate="animate"
                        exit="exit"
                        transition={{ duration: 0.5, ease: "easeInOut" }}
                        className="absolute inset-0">
                        <Image
                          className="h-full w-full object-contain"
                          src={activeImage.data_url}
                          alt={`product-preview-${safeActiveImageIndex + 1}`}
                          fill
                          sizes="(max-width: 768px) 100vw, 45vw"
                        />
                      </motion.div>
                    </AnimatePresence>

                    {imageList.length > 1 && (
                      <>
                        <button
                          type="button"
                          aria-label="Previous image"
                          onClick={() => hasPrevImage && navigateToImage(safeActiveImageIndex - 1)}
                          disabled={!hasPrevImage}
                          className={twMerge(
                            "absolute inset-y-0 left-0 z-10 flex w-[44px] items-center justify-center bg-black/40 transition-opacity duration-200",
                            hasPrevImage ? "cursor-pointer hover:bg-black/55" : "cursor-default opacity-30",
                          )}>
                          <FaAngleLeft className="h-6 w-6 text-white" />
                        </button>
                        <button
                          type="button"
                          aria-label="Next image"
                          onClick={() => hasNextImage && navigateToImage(safeActiveImageIndex + 1)}
                          disabled={!hasNextImage}
                          className={twMerge(
                            "absolute inset-y-0 right-0 z-10 flex w-[44px] items-center justify-center bg-black/40 transition-opacity duration-200",
                            hasNextImage ? "cursor-pointer hover:bg-black/55" : "cursor-default opacity-30",
                          )}>
                          <FaAngleRight className="h-6 w-6 text-white" />
                        </button>
                      </>
                    )}
                  </>
                ) : (
                  <div className="flex h-full w-full flex-col items-center justify-center gap-2">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/[0.04]">
                      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                        <rect x="2" y="4" width="16" height="12" rx="2" stroke="rgba(255,255,255,0.15)" strokeWidth="1.5" />
                        <circle cx="7" cy="8.5" r="1.5" stroke="rgba(255,255,255,0.15)" strokeWidth="1.5" />
                        <path
                          d="M2 13l4-3 3 2.5 3-4 4 4.5"
                          stroke="rgba(255,255,255,0.15)"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </div>
                    <p className="text-[11px] text-white/25">{t("click_or_drop_here")}</p>
                  </div>
                )}

                {activeImage && (
                  <div className="absolute inset-x-3 top-3 flex items-center justify-between">
                    <span className="rounded-lg bg-black/50 px-2 py-1 text-[11px] font-medium text-white/70 backdrop-blur-sm">
                      {previewStock}
                    </span>
                    <span className="rounded-lg border border-[#1fe15a]/20 bg-[#1fe15a]/15 px-2 py-1 text-[11px] font-semibold text-[#1fe15a] backdrop-blur-sm">
                      {previewPrice}
                    </span>
                  </div>
                )}

                {imageList.length > 1 && (
                  <span className="absolute bottom-3 right-3 rounded-lg bg-black/50 px-2 py-1 text-[10px] text-white/60 backdrop-blur-sm">
                    {safeActiveImageIndex + 1} / {imageList.length}
                  </span>
                )}
              </div>

              {/* Preview caption */}
              <div className="shrink-0 px-0.5">
                <p className="truncate text-sm font-semibold text-white">{previewTitle}</p>
                <p className="mt-0.5 line-clamp-2 text-[11px] leading-4 text-white/45">{previewDescription}</p>
              </div>

              {/* Thumbnail strip */}
              {imageList.length > 1 && (
                <div className="flex shrink-0 gap-1.5">
                  {imageList.slice(0, 5).map((image, index) => (
                    <button
                      key={`${image.data_url}-${index}`}
                      type="button"
                      onClick={() => navigateToImage(index)}
                      className={twMerge(
                        "relative h-11 flex-1 overflow-hidden rounded-xl border-2 border-transparent transition-all duration-150",
                        index === safeActiveImageIndex && "border-[#1fe15a]/60",
                      )}>
                      <Image
                        className="h-full w-full object-cover"
                        src={image.data_url}
                        alt={`thumb-${index + 1}`}
                        width={120}
                        height={80}
                      />
                    </button>
                  ))}
                  {imageList.length > 5 && (
                    <div className="flex h-11 min-w-[36px] items-center justify-center rounded-xl bg-white/[0.05] text-[10px] font-medium text-white/50">
                      +{imageList.length - 5}
                    </div>
                  )}
                </div>
              )}

              {/* Image actions */}
              {activeImage && (
                <div className={twMerge("grid shrink-0 gap-1.5", imageList.length > 1 ? "grid-cols-3" : "grid-cols-2")}>
                  <button
                    type="button"
                    onClick={() => makeImagePrimary(safeActiveImageIndex)}
                    disabled={isLoading}
                    aria-pressed={isPrimaryImage}
                    className={twMerge(
                      "flex h-9 items-center justify-center gap-2 rounded-xl border text-[11px] font-medium transition-colors disabled:opacity-40",
                      isPrimaryImage
                        ? "border-[#1fe15a]/35 bg-[#1fe15a]/12 text-[#1fe15a]"
                        : "border-white/10 bg-white/[0.04] text-white/60 hover:bg-white/[0.07] hover:text-white/80",
                    )}>
                    <span
                      className={twMerge(
                        "flex h-4 w-4 items-center justify-center rounded-md border transition-colors",
                        isPrimaryImage
                          ? "border-[#1fe15a] bg-[#1fe15a] text-[#071a0c]"
                          : "border-white/18 bg-transparent text-transparent",
                      )}>
                      <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true">
                        <path
                          d="M2 5.2L4.1 7.3L8 2.8"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </span>
                    {t("primary_image")}
                  </button>
                  <button
                    type="button"
                    onClick={() => onImageRemove(safeActiveImageIndex)}
                    disabled={isLoading}
                    className="h-9 rounded-xl border border-red-500/20 bg-red-500/[0.06] text-[11px] font-medium text-red-400/80 transition-colors hover:bg-red-500/[0.12] disabled:opacity-40">
                    {t("remove")}
                  </button>
                  {imageList.length > 1 && (
                    <button
                      type="button"
                      onClick={() => {
                        onImageRemoveAll()
                        setActiveImageIndex(0)
                      }}
                      disabled={isLoading}
                      className="h-9 rounded-xl border border-red-500/20 bg-red-500/[0.06] text-[11px] font-medium text-red-400/80 transition-colors hover:bg-red-500/[0.12] disabled:opacity-40">
                      {t("remove_all_images")}
                    </button>
                  )}
                </div>
              )}
            </section>
          )
        }}
      </ImageUploading>

      {/* ── RIGHT: Details Form + Variants ── */}
      <form onSubmit={handleSubmit(onSubmit)} className="panel-scroll flex min-h-0 flex-col gap-3 overflow-y-auto pb-1">
        {/* Title */}
        <div className="grid gap-1.5">
          <label className="px-0.5 text-[11px] font-semibold uppercase tracking-widest text-white/40">{t("title")}</label>
          <ProductInput
            className={twMerge(inputCn, "h-12")}
            id="title"
            register={register}
            errors={errors}
            disabled={isLoading}
            required
            placeholder={t("placeholder.title")}
          />
        </div>

        {/* Description */}
        <div className="grid gap-1.5">
          <label className="px-0.5 text-[11px] font-semibold uppercase tracking-widest text-white/40">{t("description")}</label>
          <ProductInput
            className={twMerge(inputCn, "min-h-[100px] resize-none py-3 leading-6")}
            id="subTitle"
            register={register}
            errors={errors}
            disabled={isLoading}
            required
            placeholder={t("placeholder.description")}
          />
        </div>

        {/* ── Variants (moved from left col) ── */}
        <div className="grid gap-2 rounded-2xl border border-white/8 bg-white/[0.02] p-3">
          <div className="flex items-end gap-2">
            <label className="grid flex-1 gap-1.5">
              <span className="px-0.5 text-[11px] font-semibold uppercase tracking-widest text-white/40">Variant label</span>
              <input
                className="h-11 w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 text-[14px] text-white outline-none transition-colors placeholder:text-white/25 focus:border-white/20"
                value={variantLabel}
                onChange={event => setVariantLabel(event.target.value)}
                placeholder="Bright Black Gray"
                disabled={isLoading}
              />
            </label>
            <button
              type="button"
              onClick={addVariant}
              disabled={isLoading || !images.length || variants.length >= MAX_PRODUCT_VARIANTS}
              className="h-11 rounded-2xl border border-[#1fe15a]/30 bg-[#1fe15a]/10 px-4 text-[13px] font-semibold text-[#1fe15a] transition-colors hover:bg-[#1fe15a]/16 disabled:cursor-default disabled:opacity-40">
              Add variant
            </button>
          </div>

          <p className="text-[11px] text-white/35">Choose an image on the left, then save it as a variant preview button.</p>

          {variants.length > 0 && (
            <div className="grid gap-2 tablet:grid-cols-2">
              {variants.map(variant => {
                const variantImage = images.find(image => image.data_url === variant.imageDataUrl)
                const variantImageIndex = images.findIndex(image => image.data_url === variant.imageDataUrl)
                if (!variantImage) return null

                return (
                  <div key={variant.id} className="flex items-center gap-2 rounded-2xl border border-white/8 bg-white/[0.03] p-2">
                    <button
                      type="button"
                      onClick={() => variantImageIndex >= 0 && navigateToImage(variantImageIndex)}
                      className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl border border-white/10">
                      <Image
                        className="h-full w-full object-cover"
                        src={variantImage.data_url}
                        alt={variant.label}
                        fill
                        sizes="56px"
                      />
                    </button>
                    <div className="min-w-0 flex-1">
                      <p className="line-clamp-2 text-sm font-medium text-white">{variant.label}</p>
                      <p className="mt-0.5 text-[11px] text-white/35">Preview variant</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeVariant(variant.id)}
                      className="rounded-xl border border-red-500/20 bg-red-500/[0.06] px-3 py-2 text-[11px] font-medium text-red-400/80 transition-colors hover:bg-red-500/[0.12]">
                      Remove
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Price + Stock */}
        <div className="grid grid-cols-2 gap-2">
          <div className="grid gap-1.5">
            <label className="px-0.5 text-[11px] font-semibold uppercase tracking-widest text-white/40">{t("price")}</label>
            <ProductInput
              className={twMerge(inputCn, "h-12")}
              id="price"
              type="numeric"
              register={register}
              errors={errors}
              disabled={isLoading}
              required
              placeholder={t("placeholder.price")}
            />
          </div>
          <div className="grid gap-1.5">
            <label className="px-0.5 text-[11px] font-semibold uppercase tracking-widest text-white/40">{t("on_stock")}</label>
            <ProductInput
              className={twMerge(inputCn, "h-12")}
              id="onStock"
              type="numeric"
              numericFormat="grouped"
              register={register}
              errors={errors}
              disabled={isLoading}
              required
              placeholder={t("placeholder.on_stock")}
            />
          </div>
        </div>

        {/* Live preview row */}
        <div className="grid grid-cols-2 gap-2 rounded-2xl border border-white/8 bg-white/[0.02] p-3">
          <div>
            <p className="text-[10px] font-medium uppercase tracking-widest text-white/30">{t("price")}</p>
            <p className="mt-1 text-sm font-semibold text-white/75">{previewPrice}</p>
          </div>
          <div>
            <p className="text-[10px] font-medium uppercase tracking-widest text-white/30">{t("on_stock")}</p>
            <p className="mt-1 text-sm font-semibold text-white/75">{previewStock}</p>
          </div>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={isLoading}
          className={twMerge(
            "mt-auto min-h-[48px] w-full rounded-2xl bg-[#1fe15a] px-4 py-3 text-[14px] font-semibold text-[#071a0c] transition-all duration-200",
            "hover:bg-[#2cec64] active:scale-[0.99]",
            isLoading && "cursor-not-allowed opacity-50",
          )}>
          {t("create_product")}
        </button>
      </form>
    </div>
  )
}
