"use client"

import { useEffect, useRef, useState } from "react"
import Image from "next/image"
import { AnimatePresence, motion } from "framer-motion"
import { useForm, useWatch } from "react-hook-form"
import { twMerge } from "tailwind-merge"
import { ImageListType } from "react-images-uploading"
import ImageUploading from "react-images-uploading"
import { FaAngleLeft, FaAngleRight } from "react-icons/fa"

import { TProductVariantDraft } from "@/ts/product/TProductVariant"
import { IFormDataAddProduct } from "@/ts/product/IFormDataAddProduct"
import { TProductDB } from "@/ts/product/TProductDB"
import { readPastedImages } from "../functions/readPastedImages"
import { showToastWarningFn } from "../functions/showToastWarningFn"
import { CategoryDropdown } from "./CategoryDropdown"
import { RichTextToolbar } from "./RichTextToolbar"
import { TPendingCreatedProduct, useSubscribeToProductCreated } from "../hooks/useSubscribeToProductCreated"
import { aiSDK } from "@/sdk/AISDK/AISDK"
import { categoriesSDK } from "@/sdk/CategoriesSDK/CategoriesSDK"
import { createProductFn } from "@/functions/createProductFn"
import { createRawProductTranslations, normalizeProductImageUrls } from "@/utils/product"
import { formatCurrency } from "@/utils/currencyFormatter"
import { formatGroupedNumberInput, parseFormattedNumber } from "@/utils/numberFormatter"
import { getUserId } from "@/utils/getUserId"
import { useCategories } from "@/store/categories/useCategories"
import { useCurrentLocale, useI18n, useScopedI18n } from "@/locales/client"
import useDragging from "@/hooks/ui/useDragging"
import { useOwnerProductsStore } from "@/store/user/ownerProductsStore"
import { usePasteImages } from "@/hooks/ui/usePasteImages"
import useToast from "@/store/ui/useToast"
import { validateDescription } from "@/utils/productValidation"
import {
  MAX_IMAGE_FILE_SIZE_BYTES,
  MAX_PRODUCT_IMAGES,
  MAX_PRODUCT_VARIANTS,
  MIN_IMAGE_RESOLUTION,
} from "@/constants/uploadLimits"
import { MarkdownEditor } from "@/components/ui/Inputs/MarkdownEditor"
import { ProductInput } from "@/components/ui/Inputs/Validation"

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

const BEFORE_UNLOAD_MESSAGE = "Translation in progress, are you sure you want to leave?"

interface AddProductFormProps {
  onCreated?: () => void
}

type PendingFormSnapshot = {
  values: IFormDataAddProduct
  images: ImageListType
  variants: TProductVariantDraft[]
  activeImageIndex: number
  variantLabel: string
  variantPrice: string
  variantQuantity: string
}

const EMPTY_PRODUCT_FORM_VALUES: Partial<IFormDataAddProduct> = {
  title: "",
  subTitle: "",
  onStock: "" as never,
}

// http://localhost:6006/?path=/story/admin-adminpanelmodal--add-product
export function AddProductForm({ onCreated }: AddProductFormProps) {
  const t = useScopedI18n("product")
  const tGlobal = useI18n()
  const locale = useCurrentLocale()
  const { show: showToast, close: closeToast } = useToast()
  const { isDraggingg } = useDragging()

  const [images, setImages] = useState<ImageListType>([])
  const [variantLabelValue, setVariantLabelValue] = useState("")
  const [variantPriceValue, setVariantPriceValue] = useState("")
  const [variantQuantityValue, setVariantQuantityValue] = useState("")
  const [variants, setVariants] = useState<TProductVariantDraft[]>([])
  const [activeImageIndex, setActiveImageIndex] = useState(0)
  const [pendingTranslationsAmount, setPendingTranslationsAmount] = useState(0)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [categoryId, setCategoryId] = useState<string | null>(null)
  const [autoAssignedName, setAutoAssignedName] = useState<string | null>(null)
  const [isSuggestingCategory, setIsSuggestingCategory] = useState(false)
  const dragZone = useRef<HTMLButtonElement | null>(null)
  const descriptionRef = useRef<HTMLDivElement | null>(null)
  const wrapRef = useRef<((marker: string) => void) | null>(null)
  const suggestDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastSuggestedKeyRef = useRef<string | null>(null)
  const manualCategoryPickRef = useRef(false)
  const lastSuggestedTitleRef = useRef<string | null>(null)

  const { categories: allCategories, hydrate: hydrateCategories } = useCategories()
  const previousImageIndexRef = useRef(0)
  const pendingTranslationsAmountRef = useRef(0)
  const pendingCreatedProductsRef = useRef<TPendingCreatedProduct[]>([])

  const onChange = (imageList: ImageListType) => {
    setImages(imageList)
    setActiveImageIndex(current => {
      if (imageList.length === 0) return 0
      return Math.min(current, imageList.length - 1)
    })
  }

  // Ctrl+V with a screenshot in the clipboard adds it to the gallery, same limits as the drop zone.
  usePasteImages(
    async pastedFiles => {
      const readPastedImagesResp = await readPastedImages(pastedFiles, images.length)

      if (readPastedImagesResp.images.length) {
        const nextImages = [...images, ...readPastedImagesResp.images]
        setImages(nextImages)
        setActiveImageIndex(nextImages.length - 1)
      }

      if (Object.keys(readPastedImagesResp.errors).length) {
        void showToastWarningFn(
          tGlobal,
          readPastedImagesResp.errors,
          { maxNumber: MAX_PRODUCT_IMAGES, maxFileSize: MAX_IMAGE_FILE_SIZE_BYTES, minResolution: MIN_IMAGE_RESOLUTION },
          readPastedImagesResp.rejectedFiles,
        )
      }
    },
    { isHookEnabled: !isSubmitting },
  )

  const {
    register,
    handleSubmit,
    reset,
    control,
    setValue,
    trigger,
    formState: { errors },
  } = useForm<IFormDataAddProduct>({
    defaultValues: EMPTY_PRODUCT_FORM_VALUES,
    mode: "onSubmit",
    reValidateMode: "onSubmit",
  })

  const titleValue = useWatch({ control, name: "title" })
  const descriptionValue = useWatch({ control, name: "subTitle" })

  // Register subTitle manually since it's no longer backed by a ProductInput/textarea
  useEffect(() => {
    register("subTitle", { validate: validateDescription })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const defaultVariant = variants[0]
  const previewPrice = defaultVariant?.price ? formatCurrency(defaultVariant.price) : "--"

  // Product stock = sum of every variant's stock. There is no separate on_stock input —
  // a product here always has variants, so a manual total would just contradict the per-variant counts.
  const totalStock = variants.reduce((sum, variant) => sum + variant.quantity, 0)
  const previewStock = variants.length ? formatGroupedNumberInput(String(totalStock)) : "--"

  // Shared className applied to every ProductInput — guarantees identical backgrounds
  const inputCn =
    "w-full border-white/15 !bg-white/[0.07] text-[14px] text-white placeholder:text-white/40 shadow-none transition-colors focus:border-success-accent/35 focus:!bg-white/[0.09] disabled:opacity-50"
  const isLoading = isSubmitting

  const updateBackgroundToast = (nextPendingTranslationsAmount: number) => {
    if (nextPendingTranslationsAmount <= 0) {
      closeToast()
      return
    }

    const pendingProductsLabel =
      nextPendingTranslationsAmount === 1
        ? t("one_product_processing")
        : t("products_processing", { count: nextPendingTranslationsAmount })

    showToast("success", t("creating_translating"), `${pendingProductsLabel} ${t("create_another_meanwhile")}`, null)
  }

  const increasePendingTranslations = () => {
    const nextPendingTranslationsAmount = pendingTranslationsAmountRef.current + 1
    pendingTranslationsAmountRef.current = nextPendingTranslationsAmount
    setPendingTranslationsAmount(nextPendingTranslationsAmount)
    updateBackgroundToast(nextPendingTranslationsAmount)
  }

  const decreasePendingTranslations = (showCompletedToast = false, productId?: string) => {
    const nextPendingTranslationsAmount = Math.max(0, pendingTranslationsAmountRef.current - 1)
    pendingTranslationsAmountRef.current = nextPendingTranslationsAmount
    setPendingTranslationsAmount(nextPendingTranslationsAmount)

    if (nextPendingTranslationsAmount > 0) {
      updateBackgroundToast(nextPendingTranslationsAmount)
    } else if (showCompletedToast) {
      const subTitle = productId ? (
        <a className="underline underline-offset-2" href={`/${locale}/products/${productId}`} target="_blank" rel="noreferrer">
          View product
        </a>
      ) : (
        "AI translation completed."
      )
      showToast("success", "Product created", subTitle)
    } else {
      closeToast()
    }
  }

  const rollbackOptimisticProduct = (optimisticProductId: string, errorMessage: string) => {
    const { removeProduct, setError } = useOwnerProductsStore.getState()

    removeProduct(optimisticProductId)
    setError(errorMessage)
  }

  // Fetch categories once for the dropdown
  useEffect(() => {
    if (allCategories.length > 0) return
    categoriesSDK.selectDBCategories().then(result => {
      if ("categories" in result) hydrateCategories(result.categories)
    })
  }, [allCategories.length, hydrateCategories])

  const runSuggestCategory = async (trimmed: string, isAfterManualPick = false) => {
    if (trimmed.length < 10) return
    if (!allCategories.length) return
    if (!isAfterManualPick && lastSuggestedKeyRef.current === trimmed) return
    lastSuggestedKeyRef.current = trimmed
    setIsSuggestingCategory(true)
    try {
      const response = await aiSDK.suggestCategory({ title: trimmed })
      if ("category_id" in response && response.category_id) {
        const found = allCategories.find(category => category.id === response.category_id)
        if (found) {
          setCategoryId(response.category_id)
          setAutoAssignedName(found.name)
        }
      }
    } catch {}
    setIsSuggestingCategory(false)
  }

  // Debounced AI auto-assign: fires 800ms after title stops changing, only when no category assigned yet.
  // Exception - a title edit that comes AFTER the admin picked a category by hand re-runs the suggest even
  // for an already-suggested title; picking a category on its own never triggers it (no fighting the admin).
  useEffect(() => {
    if (suggestDebounceRef.current) clearTimeout(suggestDebounceRef.current)
    const trimmed = titleValue?.trim() ?? ""
    const isTitleEdited = lastSuggestedTitleRef.current !== trimmed
    lastSuggestedTitleRef.current = trimmed
    const isAfterManualPick = isTitleEdited && manualCategoryPickRef.current

    if (categoryId && !isAfterManualPick) return
    if (trimmed.length < 10) return
    if (!allCategories.length) return
    if (!isAfterManualPick && lastSuggestedKeyRef.current === trimmed) return

    suggestDebounceRef.current = setTimeout(() => {
      manualCategoryPickRef.current = false
      void runSuggestCategory(trimmed, isAfterManualPick)
    }, 800)

    return () => {
      if (suggestDebounceRef.current) clearTimeout(suggestDebounceRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- runSuggestCategory is redefined every render, never add fns to deps
  }, [titleValue, allCategories, categoryId])

  const handleTitleBlur = () => {
    if (!categoryId) return
    void runSuggestCategory(titleValue?.trim() ?? "")
  }

  const clearForm = () => {
    reset(EMPTY_PRODUCT_FORM_VALUES)
    setImages([])
    setVariants([])
    setActiveImageIndex(0)
    previousImageIndexRef.current = 0
    lastSuggestedKeyRef.current = null
    lastSuggestedTitleRef.current = null
    manualCategoryPickRef.current = false
    setVariantLabelValue("")
    setVariantPriceValue("")
    setVariantQuantityValue("")
    setCategoryId(null)
    setAutoAssignedName(null)
  }

  const restoreFormSnapshot = (snapshot: PendingFormSnapshot) => {
    reset(snapshot.values)
    setImages(snapshot.images)
    setVariants(snapshot.variants)
    setActiveImageIndex(snapshot.activeImageIndex)
    previousImageIndexRef.current = snapshot.activeImageIndex
    setVariantLabelValue(snapshot.variantLabel)
    setVariantPriceValue(snapshot.variantPrice)
    setVariantQuantityValue(snapshot.variantQuantity)
  }

  const removePendingCreatedProduct = (optimisticProductId: string) => {
    pendingCreatedProductsRef.current = pendingCreatedProductsRef.current.filter(
      product => product.optimisticProductId !== optimisticProductId,
    )
  }

  useSubscribeToProductCreated({
    pendingCreatedProductsRef,
    decreasePendingTranslations,
  })

  const createProductInBackgroundFn = async ({
    optimisticProductId,
    normalizedTitle,
    normalizedDescription,
    formattedOnStock,
    submitImages,
    resolvedVariants,
    snapshot,
    submittedCategoryId,
  }: {
    optimisticProductId: string
    normalizedTitle: string
    normalizedDescription: string
    formattedOnStock: number
    submitImages: ImageListType
    resolvedVariants: TProductVariantDraft[]
    snapshot: PendingFormSnapshot
    submittedCategoryId: string | null
  }) => {
    try {
      await createProductFn(t, {
        title: normalizedTitle,
        description: normalizedDescription,
        onStock: formattedOnStock,
        images: submitImages,
        variants: resolvedVariants,
        manageLoading: false,
        category_id: submittedCategoryId,
      })

      useOwnerProductsStore.getState().setError(null)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)

      removePendingCreatedProduct(optimisticProductId)
      rollbackOptimisticProduct(optimisticProductId, errorMessage)
      restoreFormSnapshot(snapshot)
      decreasePendingTranslations(false)
      showToast("error", "Failed to create product", errorMessage)
    }
  }

  const onSubmit = async (data: IFormDataAddProduct) => {
    if (isSubmitting) return

    setIsSubmitting(true)

    try {
      const normalizedTitle = data.title.trim()
      const normalizedDescription = data.subTitle.trim()

      if (!images.length) {
        showToast("warning", "Image required", "Please upload at least 1 product image")
        return
      }

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
          price: variant.price,
          quantity: variant.quantity,
        }))
        .filter(variant => variant.label && variant.image_url)
      const defaultVariantPrice = optimisticVariants[0]?.price
      // Product stock is the accumulated stock of its variants (no separate manual field)
      const formattedOnStock = optimisticVariants.reduce((sum, variant) => sum + variant.quantity, 0)
      const optimisticImages = normalizeProductImageUrls(images.map(image => image.data_url || ""))
      const optimisticProductId = `optimistic-${crypto.randomUUID()}`

      if (!defaultVariantPrice || defaultVariantPrice <= 0) {
        showToast("warning", t("variant"), t("manage_variant_empty"))
        return
      }

      const optimisticProduct: TProductDB = {
        id: optimisticProductId,
        price_id: optimisticProductId,
        owner_id: getUserId(),
        translations: createRawProductTranslations(normalizedTitle, normalizedDescription),
        price: defaultVariantPrice,
        img_url: optimisticImages,
        variants: optimisticVariants.length ? optimisticVariants : null,
        on_stock: formattedOnStock,
        category_id: categoryId,
      }

      useOwnerProductsStore.getState().setError(null)
      useOwnerProductsStore.getState().addProduct(optimisticProduct)
      pendingCreatedProductsRef.current.push({
        optimisticProductId,
        owner_id: optimisticProduct.owner_id,
        title: normalizedTitle,
        description: normalizedDescription,
        price: defaultVariantPrice,
        on_stock: formattedOnStock,
        img_url: optimisticProduct.img_url,
        variants: optimisticProduct.variants,
        category_id: categoryId,
      })

      const snapshot: PendingFormSnapshot = {
        values: data,
        images: [...images],
        variants: [...variants],
        activeImageIndex,
        variantLabel: variantLabelValue,
        variantPrice: variantPriceValue,
        variantQuantity: variantQuantityValue,
      }
      const submitImages = [...images]

      clearForm()
      onCreated?.()

      increasePendingTranslations()

      void createProductInBackgroundFn({
        optimisticProductId,
        normalizedTitle,
        normalizedDescription,
        formattedOnStock,
        submitImages,
        resolvedVariants,
        snapshot,
        submittedCategoryId: categoryId,
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleFormSubmit = handleSubmit(onSubmit)

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
    const normalizedLabel = variantLabelValue.trim()
    const normalizedPrice = parseFormattedNumber(variantPriceValue)
    // Stock is optional — empty/invalid means 0 = sold out. Owner can restock later via the Edit tab.
    const parsedQuantity = parseFormattedNumber(variantQuantityValue)
    const normalizedQuantity = Number.isFinite(parsedQuantity) && parsedQuantity > 0 ? Math.floor(parsedQuantity) : 0

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

    if (!Number.isFinite(normalizedPrice) || normalizedPrice <= 0) {
      return showToast("warning", t("variant_price"), t("manage_variant_price_required"))
    }

    setVariants(currentVariants => [
      ...currentVariants,
      {
        id: crypto.randomUUID(),
        label: normalizedLabel,
        imageIndex: activeImageIndex,
        imageDataUrl: images[activeImageIndex]?.data_url || "",
        price: normalizedPrice,
        quantity: normalizedQuantity,
      },
    ])
    setVariantLabelValue("")
    setVariantPriceValue("")
    setVariantQuantityValue("")
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
        {({ imageList, onImageUpload, onImageRemoveAll, onImageRemove, isDragging, dragProps }) => {
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
                className={twMerge(
                  "group flex shrink-0 flex-col items-center justify-center gap-1.5 rounded border border-dashed border-white/15 bg-white/[0.02] px-4 py-4 text-center transition-colors duration-150",
                  "hover:border-success-accent/40 hover:bg-success-accent/10",
                  isDragging && "border-success-accent/60 bg-success-accent/12",
                  isDraggingg && "fixed inset-0 z-[101] rounded-none border-0 bg-[#0a0f15]/95",
                )}
                ref={dragZone}
                onClick={onImageUpload}
                disabled={isLoading}
                type="button"
                {...dragProps}>
                <div className="flex h-8 w-8 items-center justify-center rounded bg-white/[0.05] text-success-accent">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path
                      d="M8 2v8M5 5l3-3 3 3"
                      stroke="currentColor"
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

              {/* 16:9 main preview — black bars only behind a real image, panel surface when empty
                  so clearing the form on submit doesn't flash a black slab */}
              <div
                style={{ aspectRatio: "16/9" }}
                className={twMerge(
                  "relative w-full shrink-0 overflow-hidden rounded",
                  activeImage ? "bg-black" : "bg-white/[0.02]",
                )}>
                {activeImage ? (
                  <>
                    <AnimatePresence initial={false} custom={imageDirection} mode="popLayout">
                      <motion.div
                        className="absolute inset-0"
                        key={`${safeActiveImageIndex}-${activeImage.data_url}`}
                        custom={imageDirection}
                        variants={previewImageVariants}
                        initial="initial"
                        animate="animate"
                        exit="exit"
                        transition={{ duration: 0.5, ease: "easeInOut" }}>
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
                          className={twMerge(
                            "absolute inset-y-0 left-0 z-10 flex w-[44px] items-center justify-center bg-black/40 transition-opacity duration-200",
                            hasPrevImage ? "cursor-pointer hover:bg-black/55" : "cursor-default opacity-30",
                          )}
                          type="button"
                          aria-label="Previous image"
                          onClick={() => hasPrevImage && navigateToImage(safeActiveImageIndex - 1)}
                          disabled={!hasPrevImage}>
                          <FaAngleLeft className="h-6 w-6 text-white" />
                        </button>
                        <button
                          className={twMerge(
                            "absolute inset-y-0 right-0 z-10 flex w-[44px] items-center justify-center bg-black/40 transition-opacity duration-200",
                            hasNextImage ? "cursor-pointer hover:bg-black/55" : "cursor-default opacity-30",
                          )}
                          type="button"
                          aria-label="Next image"
                          onClick={() => hasNextImage && navigateToImage(safeActiveImageIndex + 1)}
                          disabled={!hasNextImage}>
                          <FaAngleRight className="h-6 w-6 text-white" />
                        </button>
                      </>
                    )}
                  </>
                ) : (
                  <div className="flex h-full w-full flex-col items-center justify-center gap-2">
                    <div className="flex h-12 w-12 items-center justify-center rounded bg-white/[0.04]">
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
                    <span className="rounded border border-success-accent/20 bg-success-accent/12 px-2 py-1 text-[11px] font-semibold text-success-accent backdrop-blur-sm">
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

              {/* Thumbnail strip */}
              {imageList.length > 1 && (
                <div className="flex shrink-0 gap-1.5">
                  {imageList.slice(0, 5).map((image, index) => (
                    <button
                      className={twMerge(
                        "relative h-11 flex-1 overflow-hidden rounded-xl border-2 border-transparent transition-all duration-150",
                        index === safeActiveImageIndex && "border-success-accent/60",
                      )}
                      key={`${image.data_url}-${index}`}
                      type="button"
                      onClick={() => navigateToImage(index)}>
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
                    <div className="flex h-11 min-w-[36px] items-center justify-center rounded bg-white/[0.05] text-[10px] font-medium text-white/50">
                      +{imageList.length - 5}
                    </div>
                  )}
                </div>
              )}

              {/* Image actions */}
              {activeImage && (
                <div className={twMerge("grid shrink-0 gap-1.5", imageList.length > 1 ? "grid-cols-3" : "grid-cols-2")}>
                  <button
                    className={twMerge(
                      "flex h-9 items-center justify-center gap-2 rounded border text-[11px] font-medium transition-colors disabled:opacity-40",
                      isPrimaryImage
                        ? "border-success-accent/35 bg-success-accent/12 text-success-accent"
                        : "border-white/10 bg-white/[0.04] text-white/60 hover:bg-white/[0.07] hover:text-white/80",
                    )}
                    type="button"
                    onClick={() => makeImagePrimary(safeActiveImageIndex)}
                    disabled={isLoading}
                    aria-pressed={isPrimaryImage}>
                    <span
                      className={twMerge(
                        "flex h-4 w-4 items-center justify-center rounded border transition-colors",
                        isPrimaryImage
                          ? "border-success-accent bg-success-accent text-title-foreground"
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
                    className="h-9 rounded border border-danger/50 bg-danger/8 text-[11px] font-medium text-danger transition-colors hover:bg-danger/12 disabled:opacity-40"
                    type="button"
                    onClick={() => onImageRemove(safeActiveImageIndex)}
                    disabled={isLoading}>
                    {t("remove")}
                  </button>
                  {imageList.length > 1 && (
                    <button
                      className="h-9 rounded border border-danger/50 bg-danger/8 text-[11px] font-medium text-danger transition-colors hover:bg-danger/12 disabled:opacity-40"
                      type="button"
                      onClick={() => {
                        onImageRemoveAll()
                        setActiveImageIndex(0)
                      }}
                      disabled={isLoading}>
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
      <form
        className="panel-scroll flex min-h-0 flex-col gap-3 overflow-y-auto pb-1"
        noValidate
        onSubmit={event => {
          event.preventDefault()
          event.stopPropagation()
          void handleFormSubmit(event)
        }}>
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
            onBlur={handleTitleBlur}
          />
        </div>

        {/* Description */}
        <div className="grid gap-1.5">
          <label className="px-0.5 text-[11px] font-semibold uppercase tracking-widest text-white/40">{t("description")}</label>
          <RichTextToolbar onWrap={marker => wrapRef.current?.(marker)} />
          <MarkdownEditor
            className={twMerge(inputCn, "min-h-[100px]")}
            ref={descriptionRef}
            onWrapRef={wrapRef}
            value={descriptionValue ?? ""}
            onChange={nextValue => setValue("subTitle", nextValue, { shouldValidate: false })}
            onBlur={() => void trigger("subTitle")}
            disabled={isLoading}
            placeholder={t("placeholder.description")}
          />
          {errors.subTitle?.message && <p className="font-secondary text-danger text-xs">{errors.subTitle.message as string}</p>}
        </div>

        {/* Category */}
        <div className="grid gap-1.5">
          <div className="flex items-center gap-2">
            <label className="px-0.5 text-[11px] font-semibold uppercase tracking-widest text-white/40">
              {tGlobal("category.edit_category")}
            </label>
            {isSuggestingCategory && <span className="text-[10px] text-white/40 animate-pulse">AI suggesting...</span>}
            {!isSuggestingCategory && autoAssignedName && categoryId && (
              <span className="flex items-center gap-1 rounded bg-success/10 px-1.5 py-0.5 text-[10px] text-success">
                {tGlobal("category.auto_assigned")}: {autoAssignedName}
                <button
                  className="ml-0.5 text-success/60 hover:text-success"
                  type="button"
                  tabIndex={-1}
                  onClick={() => {
                    setCategoryId(null)
                    setAutoAssignedName(null)
                  }}>
                  ×
                </button>
              </span>
            )}
          </div>
          <CategoryDropdown
            categories={allCategories}
            value={categoryId}
            onChange={id => {
              setCategoryId(id)
              setAutoAssignedName(null)
              manualCategoryPickRef.current = true
            }}
            disabled={isLoading}
            uncategorizedLabel={tGlobal("category.uncategorized")}
          />
        </div>

        {/* ── Variants (moved from left col) ── */}
        <div className="grid gap-2 rounded border border-white/8 bg-white/[0.02] p-3">
          <div className="grid gap-2 tablet:grid-cols-[minmax(0,1fr)_130px_140px_auto]">
            <label className="grid flex-1 gap-1.5">
              <span className="whitespace-nowrap px-0.5 text-[11px] font-semibold uppercase tracking-widest text-white/40">
                {t("variant_label")}
              </span>
              <input
                className="h-10 w-full rounded border border-white/15 bg-white/[0.07] px-3 text-[14px] text-white outline-none transition-colors placeholder:text-white/40 focus:border-success-accent/35 focus:bg-white/[0.09]"
                value={variantLabelValue}
                onChange={event => setVariantLabelValue(event.target.value)}
                placeholder={t("variant_label")}
                disabled={isLoading}
              />
            </label>
            <label className="grid gap-1.5">
              <span className="whitespace-nowrap px-0.5 text-[11px] font-semibold uppercase tracking-widest text-white/40">
                {t("variant_price")}
              </span>
              <input
                className="h-10 w-full rounded border border-white/15 bg-white/[0.07] px-3 text-[14px] text-white outline-none transition-colors placeholder:text-white/40 focus:border-success-accent/35 focus:bg-white/[0.09]"
                value={variantPriceValue}
                onChange={event => setVariantPriceValue(formatGroupedNumberInput(event.target.value))}
                placeholder={t("placeholder.price")}
                disabled={isLoading}
                inputMode="decimal"
              />
            </label>
            <label className="grid gap-1.5">
              <span className="whitespace-nowrap px-0.5 text-[11px] font-semibold uppercase tracking-widest text-white/40">
                {t("variant_quantity")}
              </span>
              <input
                className="h-10 w-full rounded border border-white/15 bg-white/[0.07] px-3 text-[14px] text-white outline-none transition-colors placeholder:text-white/40 focus:border-success-accent/35 focus:bg-white/[0.09]"
                value={variantQuantityValue}
                onChange={event => setVariantQuantityValue(formatGroupedNumberInput(event.target.value))}
                placeholder="0"
                disabled={isLoading}
                inputMode="numeric"
              />
            </label>
            <button
              className="h-10 rounded border border-success-accent/30 bg-success-accent/10 px-4 text-[13px] font-semibold text-success-accent transition-colors tablet:self-end hover:bg-success-accent/15 disabled:cursor-default disabled:opacity-40"
              type="button"
              onClick={addVariant}
              disabled={isLoading || !images.length || variants.length >= MAX_PRODUCT_VARIANTS}>
              {t("add_variant_action")}
            </button>
          </div>

          <p className="text-[11px] text-white/50">{t("manage_variant_help")}</p>

          {variants.length > 0 ? (
            <div className="grid gap-2 tablet:grid-cols-2">
              {variants.map(variant => {
                const variantImage = images.find(image => image.data_url === variant.imageDataUrl)
                const variantImageIndex = images.findIndex(image => image.data_url === variant.imageDataUrl)
                if (!variantImage) return null

                return (
                  <div className="flex items-center gap-2 rounded border border-white/8 bg-white/[0.03] p-2" key={variant.id}>
                    <button
                      className="relative h-14 w-14 shrink-0 overflow-hidden rounded border border-white/10"
                      type="button"
                      tabIndex={-1}
                      onClick={() => variantImageIndex >= 0 && navigateToImage(variantImageIndex)}>
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
                      <p className="mt-0.5 text-[11px] text-success">{formatCurrency(variant.price)}</p>
                      <p className={twMerge("mt-0.5 text-[11px]", variant.quantity > 0 ? "text-white/50" : "text-warning")}>
                        {variant.quantity > 0 ? `${variant.quantity} ${t("on_stock")}` : t("out_of_stock_label")}
                      </p>
                    </div>
                    <button
                      className="rounded border border-danger/50 bg-danger/8 px-3 py-2 text-[11px] font-medium text-danger transition-colors hover:bg-danger/12"
                      type="button"
                      tabIndex={-1}
                      onClick={() => removeVariant(variant.id)}>
                      {t("remove")}
                    </button>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="rounded border border-border-color/35 bg-background/35 px-3 py-3 text-sm text-subTitle">
              {t("manage_variant_empty")}
            </div>
          )}
        </div>

        {/* Live preview row — on_stock is the accumulated stock of all variants, not a manual field */}
        <div className="grid gap-2 rounded border border-white/8 bg-white/[0.02] p-3 tablet:grid-cols-2">
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
          className={twMerge(
            "ml-0.5 mt-auto min-h-[40px] w-[calc(100%-0.25rem)] rounded border border-success-accent/30 bg-success-accent/10 px-4 py-2 text-[14px] font-semibold text-success-accent transition-colors duration-150",
            "hover:bg-success-accent/15",
            (isLoading || !images.length || variants.length === 0) && "cursor-not-allowed opacity-50",
          )}
          type="submit"
          disabled={isLoading || !images.length || variants.length === 0}>
          {t("create_product")}
        </button>
      </form>
    </div>
  )
}
