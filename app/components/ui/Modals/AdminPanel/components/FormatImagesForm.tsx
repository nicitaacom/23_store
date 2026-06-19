"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import ImageUploading, { ImageListType } from "react-images-uploading"
import { BiPlus, BiTrash, BiStar, BiUpload } from "react-icons/bi"
import { twMerge } from "tailwind-merge"
import { useLoading } from "@/store/ui/useLoading"
import useToast from "@/store/ui/useToast"
import { useOwnerProductsStore } from "@/store/user/ownerProductsStore"
import { useScopedI18n, useI18n } from "@/locales/client"
import { productsSDK } from "@/sdk/ProductsSDK/ProductsSDK"
import { uploadProductImages } from "@/functions/createProductHelpers"
import { MAX_IMAGE_FILE_SIZE_BYTES, MAX_PRODUCT_IMAGES, MIN_IMAGE_RESOLUTION } from "@/constants/uploadLimits"
import { showToastWarningFn } from "../functions/showToastWarningFn"

interface FormatImagesFormProps {
  id: string
  imgUrl: string[]
}

export function FormatImagesForm({ id, imgUrl }: FormatImagesFormProps) {
  const t = useScopedI18n("product")
  const tGlobal = useI18n()
  const toast = useToast()
  const { isLoading, setIsLoading } = useLoading()
  const { replaceProduct, updateProduct } = useOwnerProductsStore()
const [newImages, setNewImages] = useState<ImageListType>([])
  const [pendingCount, setPendingCount] = useState(0)

  // Warn on navigation while a save is in flight
  useEffect(() => {
    if (pendingCount === 0) return
    const handler = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = "" }
    window.addEventListener("beforeunload", handler)
    return () => window.removeEventListener("beforeunload", handler)
  }, [pendingCount])

  async function removeExistingImage(index: number) {
    const snapshot = [...imgUrl]
    const nextUrls = imgUrl.filter((_, i) => i !== index)

    // Optimistic update
    updateProduct(id, p => ({ ...p, img_url: nextUrls }))

    setPendingCount(c => c + 1)

    try {
      const response = await productsSDK.updateProduct({ productId: id, images: nextUrls })
      if (typeof response === "string") throw new Error(response)
      replaceProduct(id, response.product)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      toast.show("error", "Error deleting product image", errorMessage)
      updateProduct(id, p => ({ ...p, img_url: snapshot }))
    } finally {
      setPendingCount(c => c - 1)
    }
  }

  async function saveImages(nextUrls: string[], filesToUpload: ImageListType) {
    setIsLoading(true)
    setPendingCount(c => c + 1)
    try {
      let uploadedUrls: string[] = []
      if (filesToUpload.length > 0) {
        const files = filesToUpload.map(img => {
          const base64 = img.data_url!
          const mime = base64.match(/data:([^;]+);/)?.[1] ?? "image/jpeg"
          const byteString = atob(base64.split(",")[1])
          const ab = new ArrayBuffer(byteString.length)
          const ia = new Uint8Array(ab)
          for (let i = 0; i < byteString.length; i++) ia[i] = byteString.charCodeAt(i)
          return new File([ab], `upload-${Date.now()}-${Math.random()}.jpg`, { type: mime })
        })
        uploadedUrls = await uploadProductImages(files, tGlobal)
      }

      let uploadIndex = 0
      const finalUrls = nextUrls.map(u => {
        if (u.startsWith("data:")) return uploadedUrls[uploadIndex++] ?? u
        return u
      })

      const response = await productsSDK.updateProduct({ productId: id, images: finalUrls })
      if (typeof response === "string") throw new Error(response)
      replaceProduct(id, response.product)
      setNewImages([])
      toast.show("success", t("changes_saved"), t("manage_product_success"), 3000)
    } catch (error) {
      toast.show("error", t("manage_product_error"), error instanceof Error ? error.message : String(error))
    } finally {
      setPendingCount(c => c - 1)
      setIsLoading(false)
    }
  }

  const allImages: string[] = [
    ...imgUrl,
    ...newImages.map(img => img.data_url!),
  ]

  function removeImage(index: number) {
    if (index < imgUrl.length) {
      void removeExistingImage(index)
    } else {
      const newIndex = index - imgUrl.length
      setNewImages(prev => prev.filter((_, i) => i !== newIndex))
    }
  }

  function makePrimary(index: number) {
    if (index === 0) return
    const next = [...allImages]
    const [item] = next.splice(index, 1)
    next.unshift(item)
    const existingNext = next.filter(u => !u.startsWith("data:"))
    const newNext = newImages.filter(img => next.includes(img.data_url!))
    void saveImages(existingNext, newNext)
  }

  return (
    <ImageUploading
      multiple
      value={newImages}
      onChange={added => {
        const total = imgUrl.length + added.length
        if (total > MAX_PRODUCT_IMAGES) {
          toast.show("warning", "Too many images", `Maximum ${MAX_PRODUCT_IMAGES} images allowed`)
          return
        }
        setNewImages(added)
        const pendingUrls = added.map(img => img.data_url!)
        void saveImages([...imgUrl, ...pendingUrls], added)
      }}
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
          { maxNumber: MAX_PRODUCT_IMAGES, maxFileSize: MAX_IMAGE_FILE_SIZE_BYTES, minResolution: MIN_IMAGE_RESOLUTION },
          files,
        )
      }}>
      {({ onImageUpload, dragProps, isDragging }) => (
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap gap-2">
            {allImages.map((url, index) => {
              const isPending = url.startsWith("data:")
              const isPrimary = index === 0
              return (
                <div key={`${url}-${index}`} className="group relative h-16 w-16 shrink-0 overflow-hidden rounded border border-border-color/30 bg-foreground/[0.06]">
                  <Image
                    src={url}
                    alt={`product-${index + 1}`}
                    fill
                    sizes="64px"
                    className="object-cover"
                  />
                  {isPending && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                      <BiUpload size={14} className="text-white/80" />
                    </div>
                  )}
                  {isPrimary && (
                    <span className="absolute left-0.5 top-0.5 rounded bg-black/60 p-0.5">
                      <BiStar size={10} className="text-yellow-400" />
                    </span>
                  )}
                  <div className="absolute inset-0 flex items-center justify-center gap-1 bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
                    {!isPrimary && (
                      <button
                        type="button"
                        disabled={isLoading}
                        onClick={() => makePrimary(index)}
                        className="rounded bg-white/10 p-1 text-white hover:bg-white/20 disabled:opacity-40"
                        title="Set as primary">
                        <BiStar size={12} />
                      </button>
                    )}
                    <button
                      type="button"
                      disabled={isLoading}
                      onClick={() => removeImage(index)}
                      className="rounded bg-danger/70 p-1 text-white hover:bg-danger disabled:opacity-40"
                      title="Remove">
                      <BiTrash size={12} />
                    </button>
                  </div>
                </div>
              )
            })}

            {/* Add button */}
            {allImages.length < MAX_PRODUCT_IMAGES && (
              <button
                type="button"
                onClick={onImageUpload}
                disabled={isLoading}
                {...dragProps}
                className={twMerge(
                  "flex h-16 w-16 shrink-0 flex-col items-center justify-center gap-1 rounded border border-dashed border-border-color/35 bg-foreground/[0.03] text-subTitle/50 transition-colors hover:border-brand/40 hover:bg-brand/5 hover:text-brand disabled:opacity-40",
                  isDragging && "border-brand/60 bg-brand/10",
                )}>
                <BiPlus size={18} />
                <span className="text-[9px] font-semibold uppercase tracking-wider">Add</span>
              </button>
            )}
          </div>

        </div>
      )}
    </ImageUploading>
  )
}
