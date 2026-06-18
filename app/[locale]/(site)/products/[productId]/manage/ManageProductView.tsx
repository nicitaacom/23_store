"use client"

import Image from "next/image"
import { useRouter } from "next/navigation"
import { useCallback, useMemo, useState } from "react"
import ImageUploading, { ImageListType } from "react-images-uploading"
import { useForm } from "react-hook-form"
import { FaAngleLeft, FaAngleRight } from "react-icons/fa"
import { FiSave, FiTrash2 } from "react-icons/fi"
import { twMerge } from "tailwind-merge"

import { Button } from "@/components/ui"
import { ProductInput } from "@/components/ui/Inputs/Validation"
import { showToastWarningFn } from "@/components/ui/Modals/AdminPanel/functions/showToastWarningFn"
import { MAX_IMAGE_FILE_SIZE_BYTES, MAX_PRODUCT_IMAGES, MAX_PRODUCT_VARIANTS, MIN_IMAGE_RESOLUTION } from "@/constants/uploadLimits"
import { uploadImageFn } from "@/functions/uploadImageFn"
import { useCurrentLocale, useI18n, useScopedI18n } from "@/locales/client"
import { productsSDK } from "@/sdk/ProductsSDK/ProductsSDK"
import useToast from "@/store/ui/useToast"
import { IFormDataAddProduct } from "@/ts/product/IFormDataAddProduct"
import { TProductDB } from "@/ts/product/TProductDB"
import { TProductVariant, TProductVariantDraft } from "@/ts/product/TProductVariant"
import { formatCurrency } from "@/utils/currencyFormatter"
import { formatGroupedNumberInput, formatNumber, parseFormattedNumber } from "@/utils/numberFormatter"
import { normalizeProductImageUrls, pt } from "@/utils/product"

interface ManageProductViewProps {
  product: TProductDB
}

function ImageWithFallback({ src, ...props }: React.ComponentProps<typeof Image>) {
  const [isBroken, setIsBroken] = useState(false)
  return <Image {...props} src={isBroken || !src ? "/no-image-fallback.png" : src} onError={() => setIsBroken(true)} />
}

function ActiveImage({ src, alt, noImageLabel }: { src: string; alt: string; noImageLabel: string }) {
  const [isBroken, setIsBroken] = useState(false)
  const showFallback = isBroken || !src
  return (
    <div className={twMerge("absolute inset-0", showFallback && "flex flex-col items-center justify-center gap-2")}>
      <Image
        src={showFallback ? "/no-image-fallback.png" : src}
        alt={alt}
        fill={!showFallback}
        width={showFallback ? 200 : undefined}
        height={showFallback ? 200 : undefined}
        priority
        sizes="(max-width: 768px) 100vw, (max-width: 1024px) 70vw, 50vw"
        className={showFallback ? "object-contain" : "object-contain p-6 mobile:p-10"}
        onError={() => setIsBroken(true)}
      />
      {showFallback && <p className="text-center text-xs text-white/40">{noImageLabel}</p>}
    </div>
  )
}

const inputCn =
  "w-full rounded-2xl border border-white/8 !bg-[#0f1318] px-4 text-[15px] text-white placeholder:text-white/22 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] transition-colors focus:border-success/30 focus:!bg-[#131922] disabled:opacity-50"

function normalizeVariantsForDraft(product: TProductDB): TProductVariantDraft[] {
  return (product.variants || []).map(variant => ({
    id: variant.id,
    label: variant.label,
    imageIndex: Math.max(product.img_url.findIndex(image => image === variant.image_url), 0),
    imageDataUrl: variant.image_url,
    price: variant.price > 0 ? variant.price : product.price,
  }))
}

function stringifyValue(value: unknown) {
  return JSON.stringify(value ?? null)
}

async function postProductUpdate(request: API.ProductsUpdateRequest) {
  return productsSDK.updateProduct(request)
}

export function ManageProductView({ product }: ManageProductViewProps) {
  const t = useScopedI18n("product")
  const tGlobal = useI18n()
  const locale = useCurrentLocale()
  const router = useRouter()
  const toast = useToast()
  const currentTranslation = pt(product, locale)

  const [images, setImages] = useState<ImageListType>(() => product.img_url.map(image => ({ data_url: image })))
  const [activeImageIndex, setActiveImageIndex] = useState(0)
  const [variantLabel, setVariantLabel] = useState("")
  const [variantPrice, setVariantPrice] = useState("")
  const [variants, setVariants] = useState<TProductVariantDraft[]>(() => normalizeVariantsForDraft(product))
  const [isSaving, setIsSaving] = useState(false)

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isDirty },
  } = useForm<IFormDataAddProduct>({
    defaultValues: {
      title: currentTranslation.title,
      subTitle: currentTranslation.description,
      onStock: product.on_stock,
    },
  })

  const titleValue = watch("title")
  const subTitleValue = watch("subTitle")
  const onStockValue = watch("onStock")

  const isImagesDirty = stringifyValue(images.map(i => i.data_url)) !== stringifyValue(product.img_url)
  const isVariantsDirty = stringifyValue(variants) !== stringifyValue(normalizeVariantsForDraft(product))
  const hasChanges = isDirty || isImagesDirty || isVariantsDirty

  const previewTitle = titleValue?.trim() || currentTranslation.title
  const previewDescription = subTitleValue?.trim() || currentTranslation.description
  const previewPrice = variants[0]?.price > 0 ? formatCurrency(variants[0].price) : formatCurrency(product.price)
  const previewStock = formatNumber(onStockValue ?? product.on_stock) || "0"
  const activeImage = images[activeImageIndex]

  const showCannotRemoveLastImageToast = useCallback(() => {
    toast.show("warning", t("manage_keep_one_image_title"), t("manage_keep_one_image_subtitle"))
  }, [t, toast])

  const navigateToImage = useCallback(
    (nextIndex: number) => {
      if (!images[nextIndex]) return
      setActiveImageIndex(nextIndex)
    },
    [images],
  )

  const onChange = useCallback((imageList: ImageListType) => {
    setImages(imageList)
    setActiveImageIndex(currentIndex => {
      if (!imageList.length) return 0
      return Math.min(currentIndex, imageList.length - 1)
    })
  }, [])

  const makeImagePrimary = useCallback((imageIndex: number) => {
    if (imageIndex <= 0) return

    setImages(currentImages => {
      const nextImages = [...currentImages]
      const [selectedImage] = nextImages.splice(imageIndex, 1)

      if (!selectedImage) return currentImages

      nextImages.unshift(selectedImage)
      return nextImages
    })
    setActiveImageIndex(0)
  }, [])

  const removeImageAt = useCallback(
    (imageIndex: number) => {
      if (images.length <= 1) {
        showCannotRemoveLastImageToast()
        return
      }

      const removedImage = images[imageIndex]
      if (!removedImage?.data_url) return

      setImages(currentImages => currentImages.filter((_, index) => index !== imageIndex))
      setVariants(currentVariants => currentVariants.filter(variant => variant.imageDataUrl !== removedImage.data_url))
      setActiveImageIndex(currentIndex => {
        const nextLength = images.length - 1
        if (nextLength <= 0) return 0
        if (currentIndex > imageIndex) return currentIndex - 1
        return Math.min(currentIndex, nextLength - 1)
      })
    },
    [images, showCannotRemoveLastImageToast],
  )

  const addVariant = useCallback(() => {
    const normalizedLabel = variantLabel.trim()
    const activeImageDataUrl = images[activeImageIndex]?.data_url
    const normalizedPrice = parseFormattedNumber(variantPrice)

    if (!images.length || !activeImageDataUrl) {
      return toast.show("warning", t("manage_upload_image_first_title"), t("manage_upload_image_first_subtitle"))
    }

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

    setVariants(currentVariants => [
      ...currentVariants,
      {
        id: crypto.randomUUID(),
        label: normalizedLabel,
        imageIndex: activeImageIndex,
        imageDataUrl: activeImageDataUrl,
        price: normalizedPrice,
      },
    ])
    setVariantLabel("")
    setVariantPrice("")
  }, [activeImageIndex, images, t, toast, variantLabel, variantPrice, variants.length])

  const updateVariantLabel = useCallback((variantId: string, nextLabel: string) => {
    setVariants(currentVariants =>
      currentVariants.map(variant => (variant.id === variantId ? { ...variant, label: nextLabel } : variant)),
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

  const assignCurrentImageToVariant = useCallback(
    (variantId: string) => {
      const activeImageDataUrl = images[activeImageIndex]?.data_url
      if (!activeImageDataUrl) return

      setVariants(currentVariants =>
        currentVariants.map(variant =>
          variant.id === variantId
            ? {
                ...variant,
                imageIndex: activeImageIndex,
                imageDataUrl: activeImageDataUrl,
              }
            : variant,
        ),
      )
    },
    [activeImageIndex, images],
  )

  const removeVariant = useCallback((variantId: string) => {
    setVariants(currentVariants => currentVariants.filter(variant => variant.id !== variantId))
  }, [])

  const resolveImageUrls = useCallback(async () => {
    const uploadedImages = await Promise.all(
      images.map(async (image, index) => {
        if (!image.file) {
          return image.data_url || ""
        }

        const uploadResult = await uploadImageFn({
          t: tGlobal,
          imageFile: image.file,
          bucket: "public-images",
          folder: product.owner_id,
          suffix: `${product.id}-${index}-${Date.now()}`,
          upsert: true,
        })

        if (typeof uploadResult === "string") {
          throw new Error(uploadResult)
        }

        return uploadResult.publicUrl
      }),
    )

    return normalizeProductImageUrls(uploadedImages)
  }, [images, product.id, product.owner_id, tGlobal])

  const buildResolvedVariants = useCallback(
    (resolvedImageUrls: string[]) => {
      return variants
        .map(variant => {
          const imageIndex = images.findIndex(image => image.data_url === variant.imageDataUrl)
          if (imageIndex < 0 || !resolvedImageUrls[imageIndex] || !variant.label.trim()) return null

          return {
            id: variant.id,
            label: variant.label.trim(),
            image_url: resolvedImageUrls[imageIndex],
            price: variant.price > 0 ? variant.price : product.price,
          } satisfies TProductVariant
        })
        .filter((variant): variant is TProductVariant => Boolean(variant))
    },
    [images, product.price, variants],
  )

  const onSubmit = useCallback(
    async (data: IFormDataAddProduct) => {
      if (!images.length) {
        return toast.show("warning", t("manage_upload_image_first_title"), t("manage_upload_image_first_subtitle"))
      }

      if (!variants.length) {
        return toast.show("warning", t("variant"), t("manage_variant_empty"))
      }

      setIsSaving(true)

      try {
        const resolvedImageUrls = await resolveImageUrls()
        const resolvedVariants = buildResolvedVariants(resolvedImageUrls)
        const normalizedTitle = data.title.trim()
        const normalizedSubTitle = data.subTitle.trim()
        const normalizedOnStock = parseFormattedNumber(String(data.onStock))
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

        if (stringifyValue(resolvedImageUrls) !== stringifyValue(product.img_url)) {
          await postProductUpdate({ productId: nextProductId, images: resolvedImageUrls })
        }

        if (stringifyValue(resolvedVariants) !== stringifyValue(product.variants ?? null)) {
          await postProductUpdate({ productId: nextProductId, variants: resolvedVariants })
        }

        if (normalizedOnStock !== product.on_stock) {
          await postProductUpdate({ productId: nextProductId, onStock: normalizedOnStock })
        }

        if (normalizedPrice !== product.price) {
          const responseData = await postProductUpdate({ productId: nextProductId, price: normalizedPrice })
          nextProductId = responseData.product?.id || nextProductId
        }

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
        setIsSaving(false)
      }
    },
    [
      buildResolvedVariants,
      images.length,
      locale,
      product.id,
      product.img_url,
      product.on_stock,
      product.price,
      product.translations,
      product.variants,
      resolveImageUrls,
      router,
      t,
      toast,
    ],
  )

  const deleteProduct = useCallback(async () => {
    if (!window.confirm(t("confirm_delete_product"))) return

    setIsSaving(true)
    try {
      await productsSDK.deleteProduct({ id: product.id })

      toast.show("success", t("product_deleted"), currentTranslation.title)
      router.push(`/${locale}`)
      router.refresh()
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      toast.show("error", t("manage_product_error"), errorMessage)
    } finally {
      setIsSaving(false)
    }
  }, [currentTranslation.title, locale, product.id, router, t, toast])

  const variantCards = useMemo(
    () =>
      variants.map(variant => {
        const linkedImageIndex = images.findIndex(image => image.data_url === variant.imageDataUrl)
        const linkedImage = linkedImageIndex >= 0 ? images[linkedImageIndex] : null

        return (
          <div
            key={variant.id}
            className="rounded-2xl border border-white/8 bg-[linear-gradient(180deg,rgba(14,18,24,0.96),rgba(9,11,15,0.98))] p-3 shadow-[0_14px_40px_rgba(0,0,0,0.2)]">
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => linkedImageIndex >= 0 && navigateToImage(linkedImageIndex)}
                className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-white/10 bg-black">
                {linkedImage?.data_url ? (
                  <Image src={linkedImage.data_url} alt={variant.label} fill className="object-cover" sizes="64px" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-[10px] text-white/35">{t("variant")}</div>
                )}
              </button>

              <div className="flex min-w-0 flex-1 flex-col gap-2">
                <input
                  value={variant.label}
                  onChange={event => updateVariantLabel(variant.id, event.target.value)}
                  className="w-full rounded-xl border border-white/8 bg-[#0f1318] px-3 py-2 text-sm text-white outline-none transition-colors focus:border-success/30"
                  placeholder={t("variant_label")}
                  disabled={isSaving}
                />

                <input
                  value={variant.price > 0 ? formatGroupedNumberInput(String(variant.price)) : ""}
                  onChange={event => updateVariantPrice(variant.id, event.target.value)}
                  className="w-full rounded-xl border border-white/8 bg-[#0f1318] px-3 py-2 text-sm text-white outline-none transition-colors focus:border-success/30"
                  placeholder={t("placeholder.price")}
                  disabled={isSaving}
                  inputMode="decimal"
                />

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => assignCurrentImageToVariant(variant.id)}
                    className="rounded-xl border border-success/20 bg-success/8 px-3 py-2 text-xs font-medium text-success transition-colors hover:bg-success/12">
                    {t("assign_current_image")}
                  </button>
                  <button
                    type="button"
                    onClick={() => removeVariant(variant.id)}
                    className="rounded-xl border border-danger/20 bg-danger/8 px-3 py-2 text-xs font-medium text-danger transition-colors hover:bg-danger/12">
                    {t("remove")}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )
      }),
    [assignCurrentImageToVariant, images, isSaving, navigateToImage, removeVariant, t, updateVariantLabel, updateVariantPrice, variants],
  )

  return (
    <div className="grid gap-6 laptop:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
      <section className="grid gap-4 tablet:grid-cols-[92px_minmax(0,1fr)]">
        <div className="order-2 tablet:order-1">
          <div className="flex gap-3 overflow-x-auto pb-1 tablet:max-h-[760px] tablet:flex-col tablet:overflow-y-auto tablet:pb-0">
            {images.map((image, index) => (
              <button
                key={`${image.data_url}-${index}`}
                type="button"
                onClick={() => navigateToImage(index)}
                className={twMerge(
                  "relative h-20 w-20 shrink-0 overflow-hidden rounded-2xl border bg-[#0f1318] transition-all duration-200",
                  index === activeImageIndex
                    ? "border-success/55 shadow-lg shadow-success/10"
                    : "border-white/8 hover:border-success/25 hover:bg-[#141a22]",
                )}>
                <ImageWithFallback src={image.data_url} alt={`${previewTitle}-${index + 1}`} fill className="object-cover" sizes="80px" />
              </button>
            ))}
          </div>
        </div>

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
          {({ onImageUpload, dragProps }) => (
            <div className="order-1 tablet:order-2">
              <div className="overflow-hidden rounded-2xl border border-white/8 bg-[radial-gradient(circle_at_top_left,rgba(24,110,52,0.24),transparent_34%),linear-gradient(180deg,rgba(10,13,18,0.98),rgba(6,8,12,0.99))] shadow-[0_24px_80px_rgba(0,0,0,0.45)]">
                <div className="relative aspect-[4/5] w-full">
                  {activeImage?.data_url ? (
                    <ActiveImage src={activeImage.data_url} alt={previewTitle} noImageLabel={tGlobal("product.no_image_found")} />
                  ) : (
                    <button
                      type="button"
                      onClick={onImageUpload}
                      className="flex h-full w-full flex-col items-center justify-center gap-3 text-center text-white/45"
                      {...dragProps}>
                      <span className="text-sm font-medium">{t("click_or_drop_here")}</span>
                    </button>
                  )}

                  {images.length > 1 && (
                    <>
                      <button
                        type="button"
                        onClick={() => navigateToImage(Math.max(activeImageIndex - 1, 0))}
                        className="absolute inset-y-0 left-0 flex w-11 items-center justify-center bg-black/45 text-white transition-colors hover:bg-black/60">
                        <FaAngleLeft className="text-lg" />
                      </button>
                      <button
                        type="button"
                        onClick={() => navigateToImage(Math.min(activeImageIndex + 1, images.length - 1))}
                        className="absolute inset-y-0 right-0 flex w-11 items-center justify-center bg-black/45 text-white transition-colors hover:bg-black/60">
                        <FaAngleRight className="text-lg" />
                      </button>
                    </>
                  )}
                </div>
              </div>

              <div className="mt-4 rounded-2xl border border-white/8 bg-[linear-gradient(145deg,rgba(12,16,21,0.98),rgba(8,10,14,0.99))] p-5 shadow-[0_22px_70px_rgba(0,0,0,0.34)]">
                <p className="text-[11px] font-semibold uppercase tracking-widest text-white/40">{t("manage_images")}</p>
                <h2 className="mt-1.5 text-xl font-semibold leading-snug text-title">{previewTitle}</h2>
                <p className="mt-1 line-clamp-2 text-sm leading-6 text-subTitle">{previewDescription}</p>

                <div className="mt-4 flex items-center gap-3">
                  <div className="flex-1 rounded-xl border border-white/8 bg-[#0f1318] px-3 py-2">
                    <p className="text-[10px] uppercase tracking-widest text-white/40">{t("on_stock")}</p>
                    <p className="mt-0.5 text-base font-semibold text-title">{previewStock}</p>
                  </div>
                  <div className="flex-1 rounded-xl border border-success/18 bg-success/8 px-3 py-2">
                    <p className="text-[10px] uppercase tracking-widest text-white/40">{t("price")}</p>
                    <p className="mt-0.5 text-base font-bold text-success">{previewPrice}</p>
                  </div>
                </div>

                <div className="mt-4 grid gap-2 mobile:grid-cols-3">
                  <button
                    type="button"
                    onClick={onImageUpload}
                    className="rounded-xl border border-success/18 bg-success/8 px-3 py-2.5 text-sm font-medium text-success transition-colors hover:bg-success/12"
                    {...dragProps}>
                    {t("click_or_drop_here")}
                  </button>
                  <button
                    type="button"
                    onClick={() => makeImagePrimary(activeImageIndex)}
                    disabled={activeImageIndex === 0 || !images.length}
                    className="rounded-xl border border-white/8 bg-[#0f1318] px-3 py-2.5 text-sm font-medium text-title transition-colors hover:border-success/25 hover:bg-[#141a22] disabled:opacity-40">
                    {t("primary_image")}
                  </button>
                  <button
                    type="button"
                    onClick={() => removeImageAt(activeImageIndex)}
                    disabled={!images.length || images.length === 1}
                    className="rounded-xl border border-danger/18 bg-danger/8 px-3 py-2.5 text-sm font-medium text-danger transition-colors hover:bg-danger/12 disabled:opacity-40">
                    {t("remove")}
                  </button>
                </div>
              </div>
            </div>
          )}
        </ImageUploading>
      </section>

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <section className="rounded-2xl border border-white/8 bg-[radial-gradient(circle_at_top_left,rgba(20,90,44,0.22),transparent_28%),linear-gradient(155deg,rgba(11,14,19,0.99),rgba(8,10,14,1))] p-6 shadow-[0_24px_90px_rgba(0,0,0,0.42)]">
          <div className="mb-4">
            <p className="text-xs uppercase tracking-[0.24em] text-subTitle">{t("manage_product")}</p>
            <h1 className="mt-2 text-3xl font-semibold text-title">{t("manage_product_title")}</h1>
            <p className="mt-2 text-sm leading-6 text-subTitle">{t("manage_product_subtitle")}</p>
          </div>

          <div className="grid gap-4">
            <div className="grid gap-1.5">
              <label className="px-0.5 text-[11px] font-semibold uppercase tracking-widest text-white/40">{t("title")}</label>
              <ProductInput
                className={twMerge(inputCn, "h-12")}
                id="title"
                register={register}
                errors={errors}
                disabled={isSaving}
                required
                placeholder={t("placeholder.title")}
              />
            </div>

            <div className="grid gap-1.5">
              <label className="px-0.5 text-[11px] font-semibold uppercase tracking-widest text-white/40">{t("description")}</label>
              <ProductInput
                className={twMerge(inputCn, "min-h-[120px] resize-none py-3 leading-6")}
                id="subTitle"
                register={register}
                errors={errors}
                disabled={isSaving}
                placeholder={t("placeholder.description")}
              />
            </div>

            <div className="grid items-end gap-4 mobile:grid-cols-2">
              <div className="grid gap-1.5">
                <label className="px-0.5 text-[11px] font-semibold uppercase tracking-widest text-white/40">{t("on_stock")}</label>
                <ProductInput
                  className={twMerge(inputCn, "h-12")}
                  id="onStock"
                  type="numeric"
                  numericFormat="grouped"
                  register={register}
                  errors={errors}
                  disabled={isSaving}
                  required
                  placeholder={String(product.on_stock ?? 0)}
                />
              </div>

              <div className="h-12 flex items-center justify-between rounded-2xl border border-success/18 bg-success/8 px-4">
                <p className="text-xs uppercase tracking-[0.2em] text-subTitle">{t("price")}</p>
                <p className="text-lg font-semibold text-success">{previewPrice}</p>
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-white/8 bg-[linear-gradient(180deg,rgba(10,13,18,0.98),rgba(7,9,13,0.99))] p-6 shadow-[0_18px_60px_rgba(0,0,0,0.28)]">
          <div className="flex flex-col gap-3">
            <div className="grid items-end gap-3 mobile:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
              <label className="grid gap-1.5">
                <span className="px-0.5 text-[11px] font-semibold uppercase tracking-widest text-white/40">{t("variant_label")}</span>
                <input
                  className={twMerge(inputCn, "h-12")}
                  value={variantLabel}
                  onChange={event => setVariantLabel(event.target.value)}
                  placeholder={t("variant_label")}
                  disabled={isSaving}
                />
              </label>

              <label className="grid gap-1.5">
                <span className="px-0.5 text-[11px] font-semibold uppercase tracking-widest text-white/40">{t("variant_price")}</span>
                <input
                  className={twMerge(inputCn, "h-12")}
                  value={variantPrice}
                  onChange={event => setVariantPrice(formatGroupedNumberInput(event.target.value))}
                  placeholder={t("placeholder.price")}
                  disabled={isSaving}
                  inputMode="decimal"
                />
              </label>

              <Button
                className="font-medium"
                type="button"
                onClick={addVariant}
                disabled={isSaving}
                variant="success-outline"
                size="lg"
                rounded="lg"
                shadow="sm">
                {t("add_variant_action")}
              </Button>
            </div>

            {!variants.length && <p className="text-sm text-subTitle">{t("manage_variant_help")}</p>}
          </div>

          <div className="mt-4 grid gap-3">
            {variantCards.length ? variantCards : <p className="text-sm text-subTitle">{t("manage_variant_empty")}</p>}
          </div>
        </section>

        <section className="rounded-2xl border border-white/8 bg-[linear-gradient(180deg,rgba(10,13,18,0.98),rgba(7,9,13,0.99))] p-6 shadow-[0_18px_60px_rgba(0,0,0,0.28)]">
          <div className="flex flex-wrap gap-3">
            <Button
              className="font-medium"
              type="button"
              onClick={deleteProduct}
              disabled={isSaving}
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
              disabled={isSaving || !hasChanges}
              variant="success"
              size="lg"
              rounded="lg"
              shadow="sm"
              rightIcon={<FiSave className="text-base" />}>
              {isSaving ? t("saving_changes") : t("save_changes")}
            </Button>
          </div>
        </section>
      </form>
    </div>
  )
}
