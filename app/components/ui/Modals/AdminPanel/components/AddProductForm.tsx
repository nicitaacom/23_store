"use client"

import { useState, useRef } from "react"
import Image from "next/image"
import { useForm } from "react-hook-form"
import { twMerge } from "tailwind-merge"
import { ImageListType } from "react-images-uploading"
import ImageUploading from "react-images-uploading"

import { IFormDataAddProduct } from "@/ts/product/IFormDataAddProduct"
import { ProductInput } from "@/components/ui/Inputs/Validation"
import { Button } from "@/components/ui/Button"
import useDragging from "@/hooks/ui/useDragging"
import useToast from "@/store/ui/useToast"
import { useLoading } from "@/store/ui/useLoading"
import { formatCurrency } from "@/utils/currencyFormatter"
import { showToastWarningFn } from "../functions/showToastWarningFn"
import { createProductFn } from "@/functions/createProductFn"
import { useI18n, useScopedI18n } from "@/locales/client"
import { MAX_IMAGE_FILE_SIZE_BYTES, MIN_IMAGE_RESOLUTION } from "@/constants/uploadLimits"

export function AddProductForm() {
  const t = useScopedI18n("product")
  const tGlobal = useI18n()
  const toast = useToast()
  const { isDraggingg } = useDragging()
  const { isLoading } = useLoading()

  const [images, setImages] = useState<ImageListType>([])
  const [activeImageIndex, setActiveImageIndex] = useState(0)
  const dragZone = useRef<HTMLButtonElement | null>(null)

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

  const numericOnStock = typeof onStockValue === "number" ? onStockValue : Number(onStockValue)
  const previewStock = Number.isFinite(numericOnStock) && numericOnStock >= 0 ? `${numericOnStock}` : "--"

  // Shared className applied to every ProductInput — guarantees identical backgrounds
  const inputCn =
    "w-full rounded-2xl border border-white/10 !bg-white/[0.04] px-4 text-[15px] text-white placeholder:text-white/25 shadow-none transition-colors focus:border-white/20 focus:!bg-white/[0.06] disabled:opacity-50"

  const onSubmit = async (data: IFormDataAddProduct) => {
    if (data.subTitle.length > 600) return toast.show("warning", "Enter shorter description", "Enter description 0-600 symbols")
    await createProductFn(t, data.title, data.subTitle, data.price, data.onStock, images)
  }

  return (
    <div className="mx-auto grid h-full min-h-0 w-full gap-3 mobile:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
      {/* ── LEFT: Image Gallery ── */}
      <ImageUploading
        multiple
        value={images}
        onChange={onChange}
        maxFileSize={MAX_IMAGE_FILE_SIZE_BYTES}
        resolutionWidth={MIN_IMAGE_RESOLUTION.width}
        resolutionHeight={MIN_IMAGE_RESOLUTION.height}
        resolutionType="more"
        dataURLKey="data_url"
        onError={errors =>
          showToastWarningFn(tGlobal, errors, {
            maxFileSize: MAX_IMAGE_FILE_SIZE_BYTES,
            minResolution: MIN_IMAGE_RESOLUTION,
          })
        }>
        {({ imageList, onImageUpload, onImageRemoveAll, onImageUpdate, onImageRemove, isDragging, dragProps }) => {
          const safeActiveImageIndex = imageList[activeImageIndex] ? activeImageIndex : 0
          const activeImage = imageList[safeActiveImageIndex]

          return (
            <section className="flex h-full min-h-0 flex-col gap-2">
              {/* Upload trigger */}
              <button
                ref={dragZone}
                onClick={onImageUpload}
                disabled={isLoading}
                type="button"
                {...dragProps}
                className={twMerge(
                  "group flex flex-col items-center justify-center gap-1.5 rounded-2xl border border-dashed border-white/15 bg-white/[0.02] px-4 py-5 text-center transition-all duration-200",
                  "hover:border-[#1fe15a]/40 hover:bg-[#1fe15a]/[0.04]",
                  isDragging && "border-[#1fe15a]/60 bg-[#1fe15a]/[0.07]",
                  isDraggingg && "fixed inset-0 z-[101] rounded-none border-0 bg-[#0a0f15]/95",
                )}>
                {/* Upload icon */}
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

              {/* Main image preview */}
              <div className="relative flex-1 overflow-hidden rounded-2xl bg-white/[0.03]">
                {activeImage ? (
                  <Image
                    className="h-full w-full object-cover"
                    src={activeImage.data_url}
                    alt={`product-preview-${safeActiveImageIndex + 1}`}
                    width={960}
                    height={720}
                  />
                ) : (
                  <div className="flex h-full min-h-[200px] w-full flex-col items-center justify-center gap-2">
                    <div className="h-12 w-12 rounded-2xl bg-white/[0.04] flex items-center justify-center">
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

                {/* Overlay badges */}
                {activeImage && (
                  <div className="absolute inset-x-3 top-3 flex items-center justify-between">
                    <span className="rounded-lg bg-black/50 px-2 py-1 text-[11px] font-medium text-white/70 backdrop-blur-sm">
                      {previewStock}
                    </span>
                    <span className="rounded-lg bg-[#1fe15a]/15 px-2 py-1 text-[11px] font-semibold text-[#1fe15a] backdrop-blur-sm border border-[#1fe15a]/20">
                      {previewPrice}
                    </span>
                  </div>
                )}

                {/* Image counter */}
                {imageList.length > 1 && (
                  <span className="absolute bottom-3 right-3 rounded-lg bg-black/50 px-2 py-1 text-[10px] text-white/60 backdrop-blur-sm">
                    {safeActiveImageIndex + 1} / {imageList.length}
                  </span>
                )}
              </div>

              {/* Preview caption */}
              <div className="px-0.5">
                <p className="truncate text-sm font-semibold text-white">{previewTitle}</p>
                <p className="mt-0.5 line-clamp-2 text-[11px] leading-4 text-white/45">{previewDescription}</p>
              </div>

              {/* Thumbnail strip */}
              {imageList.length > 1 && (
                <div className="flex gap-1.5">
                  {imageList.slice(0, 4).map((image, index) => (
                    <button
                      key={`${image.data_url}-${index}`}
                      type="button"
                      onClick={() => setActiveImageIndex(index)}
                      className={twMerge(
                        "relative h-10 flex-1 overflow-hidden rounded-xl border-2 border-transparent transition-all duration-150",
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
                  {imageList.length > 4 && (
                    <div className="flex h-10 min-w-[36px] items-center justify-center rounded-xl bg-white/[0.05] text-[10px] font-medium text-white/50">
                      +{imageList.length - 4}
                    </div>
                  )}
                </div>
              )}

              {/* Image actions */}
              {activeImage && (
                <div className={twMerge("grid gap-1.5", imageList.length > 1 ? "grid-cols-3" : "grid-cols-2")}>
                  <button
                    type="button"
                    onClick={() => onImageUpdate(safeActiveImageIndex)}
                    disabled={isLoading}
                    className="h-9 rounded-xl border border-white/10 bg-white/[0.04] text-[11px] font-medium text-white/60 transition-colors hover:bg-white/[0.07] hover:text-white/80 disabled:opacity-40">
                    {t("update")}
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

      {/* ── RIGHT: Details Form ── */}
      <form onSubmit={handleSubmit(onSubmit)} className="flex h-full min-h-0 flex-col gap-3">
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
        <div className="grid flex-1 gap-1.5">
          <label className="px-0.5 text-[11px] font-semibold uppercase tracking-widest text-white/40">{t("description")}</label>
          <ProductInput
            className={twMerge(inputCn, "h-full min-h-[120px] py-3 leading-6 resize-none")}
            id="subTitle"
            register={register}
            errors={errors}
            disabled={isLoading}
            required
            placeholder={t("placeholder.description")}
          />
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
            "h-12 w-full rounded-2xl bg-[#1fe15a] text-[14px] font-semibold text-[#071a0c] transition-all duration-200",
            "hover:bg-[#2cec64] active:scale-[0.99]",
            isLoading && "cursor-not-allowed opacity-50",
          )}>
          {t("create_product")}
        </button>
      </form>
    </div>
  )
}
