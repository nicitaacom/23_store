"use client"

import { useState, useEffect, useRef } from "react"
import Image from "next/image"
import ImageUploading, { ImageListType } from "react-images-uploading"
import { BiPlus, BiTrash, BiStar, BiUpload } from "react-icons/bi"
import { twMerge } from "tailwind-merge"

import { showToastWarningFn } from "../functions/showToastWarningFn"
import { productsSDK } from "@/sdk/ProductsSDK/ProductsSDK"
import { uploadProductImages } from "@/functions/createProductHelpers"
import { useLoading } from "@/store/ui/useLoading"
import { useOwnerProductsStore } from "@/store/user/ownerProductsStore"
import { useScopedI18n, useI18n } from "@/locales/client"
import useToast from "@/store/ui/useToast"
import { MAX_IMAGE_FILE_SIZE_BYTES, MAX_PRODUCT_IMAGES, MIN_IMAGE_RESOLUTION } from "@/constants/uploadLimits"

interface FormatImagesFormProps {
  id: string
  imgUrl: string[]
  selectedIndex?: number
  onSelect?: (index: number) => void
  onHover?: (index: number) => void
}

// http://localhost:6006/?path=/story/admin-adminpanelmodal--add-product
export function FormatImagesForm({ id, imgUrl, selectedIndex, onSelect, onHover }: FormatImagesFormProps) {
  const t = useScopedI18n("product")
  const tGlobal = useI18n()
  const toast = useToast()
  const { isLoading, setIsLoading } = useLoading()
  const { replaceProduct, updateProduct } = useOwnerProductsStore()
  const [newImages, setNewImages] = useState<ImageListType>([])
  const [pendingCount, setPendingCount] = useState(0)
  const [deletingUrls, setDeletingUrls] = useState<Set<string>>(new Set())

  // Single source of truth for pending delete state — avoids race conditions
  // when multiple images are deleted rapidly before any API call resolves.
  const pendingUrlsRef = useRef<string[] | null>(null)
  const deleteTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const snapshotRef = useRef<string[]>([])

  // Warn on navigation while a save is in flight
  useEffect(() => {
    if (pendingCount === 0) return
    const handler = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = "" }
    window.addEventListener("beforeunload", handler)
    return () => window.removeEventListener("beforeunload", handler)
  }, [pendingCount])

  function removeExistingImage(url: string) {
    if (deletingUrls.has(url)) return

    // First delete in a batch — capture snapshot of current server state
    if (pendingUrlsRef.current === null) {
      snapshotRef.current = [...imgUrl]
      pendingUrlsRef.current = [...imgUrl]
    }

    // Remove from the accumulated pending list
    pendingUrlsRef.current = pendingUrlsRef.current.filter(pendingUrl => pendingUrl !== url)
    setDeletingUrls(prev => new Set(prev).add(url))

    // Optimistically show the removal immediately
    updateProduct(id, product => ({ ...product, img_url: pendingUrlsRef.current! }))

    // Debounce: wait for rapid consecutive deletes before sending API call
    if (deleteTimerRef.current) clearTimeout(deleteTimerRef.current)
    deleteTimerRef.current = setTimeout(async () => {
      const nextUrls = pendingUrlsRef.current!
      const snapshot = snapshotRef.current
      pendingUrlsRef.current = null
      deleteTimerRef.current = null

      setPendingCount(count => count + 1)
      try {
        const response = await productsSDK.updateProduct({ productId: id, images: nextUrls })
        if (typeof response === "string") throw new Error(response)
        replaceProduct(id, response.product)
        setDeletingUrls(new Set())
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error)
        toast.show("error", "Error deleting product image", errorMessage)
        updateProduct(id, product => ({ ...product, img_url: snapshot }))
        setDeletingUrls(new Set())
      } finally {
        setPendingCount(count => count - 1)
      }
    }, 400)
  }

  async function saveImages(nextUrls: string[], filesToUpload: ImageListType, existingImgUrl = imgUrl) {
    setIsLoading(true)
    setPendingCount(count => count + 1)
    try {
      let uploadedUrls: string[] = []
      if (filesToUpload.length > 0) {
        const files = filesToUpload
          .map(img => img.file)
          .filter((file): file is File => file instanceof File)
        uploadedUrls = await uploadProductImages(files, tGlobal)
      }

      let uploadIndex = 0
      const finalUrls = nextUrls.map(nextUrl => {
        if (nextUrl.startsWith("data:")) return uploadedUrls[uploadIndex++] ?? nextUrl
        return nextUrl
      })

      const response = await productsSDK.updateProduct({ productId: id, images: finalUrls })
      if (typeof response === "string") throw new Error(response)
      replaceProduct(id, response.product)

      // Remap variant image_url fields to new uploaded URLs (positional: old imgUrl[i] → finalUrls[i])
      const updatedProduct = response.product
      if (updatedProduct.variants?.length) {
        const urlMap = new Map(existingImgUrl.map((old, index) => [old, finalUrls[index] ?? old]))
        const remappedVariants = updatedProduct.variants.map(variant => ({
          ...variant,
          image_url: urlMap.get(variant.image_url) ?? variant.image_url,
        }))
        const updateProductResp = await productsSDK.updateProduct({ productId: id, variants: remappedVariants })
        if (typeof updateProductResp !== "string") replaceProduct(id, updateProductResp.product)
      }

      setNewImages([])
      toast.show("success", t("changes_saved"), t("manage_product_success"), 3000)
    } catch (error) {
      toast.show("error", t("manage_product_error"), error instanceof Error ? error.message : String(error))
    } finally {
      setPendingCount(count => count - 1)
      setIsLoading(false)
    }
  }

  const allImages: string[] = [
    ...imgUrl,
    ...newImages.map(img => img.data_url!),
  ]

  function removeImage(url: string, index: number) {
    if (!url.startsWith("data:")) {
      void removeExistingImage(url)
    } else {
      const newIndex = index - imgUrl.length
      setNewImages(prev => prev.filter((_, index) => index !== newIndex))
    }
  }

  function makePrimary(index: number) {
    if (index === 0) return
    const snapshot = [...imgUrl]
    const next = [...allImages]
    const [item] = next.splice(index, 1)
    next.unshift(item)
    const existingNext = next.filter(url => !url.startsWith("data:"))
    const newNext = newImages.filter(img => next.includes(img.data_url!))
    void saveImages(existingNext, newNext, snapshot)
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
        const snapshotImgUrl = [...imgUrl] // capture before any async state changes
        const pendingUrls = added.map(img => img.data_url!)
        void saveImages([...snapshotImgUrl, ...pendingUrls], added, snapshotImgUrl)
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
              const isSelected = selectedIndex === index
              return (
                <div
                  className={twMerge(
                    "group relative h-16 w-16 shrink-0 cursor-pointer overflow-hidden rounded border bg-foreground/[0.06]",
                    isSelected ? "border-brand/60 ring-1 ring-brand/40" : "border-border-color/30",
                  )}
                  key={`${url}-${index}`}
                  onClick={() => onSelect?.(index)}
                  onMouseEnter={() => onHover?.(index)}
                  onMouseLeave={() => onHover?.(selectedIndex ?? 0)}>
                  <Image
                    className="object-cover"
                    src={url}
                    alt={`product-${index + 1}`}
                    fill
                    sizes="64px"
                  />
                  {isPending && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                      <BiUpload className="text-white/80" size={14} />
                    </div>
                  )}
                  {isPrimary && (
                    <span className="absolute left-0.5 top-0.5 rounded bg-black/60 p-0.5">
                      <BiStar className="text-yellow-400" size={10} />
                    </span>
                  )}
                  <div className="absolute inset-0 flex items-center justify-center gap-1 bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
                    {!isPrimary && (
                      <button
                        className="rounded bg-white/10 p-1 text-white hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-40"
                        type="button"
                        disabled={isLoading}
                        onClick={e => { e.stopPropagation(); makePrimary(index) }}
                        title="Set as primary">
                        <BiStar size={12} />
                      </button>
                    )}
                    <button
                      className="rounded bg-danger/70 p-1 text-white hover:bg-danger disabled:cursor-not-allowed disabled:opacity-40"
                      type="button"
                      disabled={deletingUrls.has(url)}
                      onClick={e => { e.stopPropagation(); removeImage(url, index) }}
                      title="Remove">
                      <BiTrash size={12} />
                    </button>
                  </div>
                </div>
              )
            })}

            {/* Add button */}
            {imgUrl.length < MAX_PRODUCT_IMAGES && (
              <button
                className={twMerge(
                  "flex h-16 w-16 shrink-0 flex-col items-center justify-center gap-1 rounded border border-dashed border-border-color/35 bg-foreground/[0.03] text-subTitle/50 transition-colors hover:border-brand/40 hover:bg-brand/5 hover:text-brand disabled:opacity-40",
                  isDragging && "border-brand/60 bg-brand/10",
                )}
                type="button"
                onClick={onImageUpload}
                disabled={isLoading}
                {...dragProps}>
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
