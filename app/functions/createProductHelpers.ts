import { ImageListType } from "react-images-uploading"

import { productsSDK } from "@/sdk/ProductsSDK/ProductsSDK"
import { aiSDK } from "@/sdk/AISDK/AISDK"
import { uploadImageFn } from "./uploadImageFn"
import { TProductVariant, TProductVariantDraft } from "@/ts/product/TProductVariant"
import { TI18nFunction } from "@/ts/types/i18n/TI18nFunction"
import { MAX_PRODUCT_IMAGES, MAX_PRODUCT_VARIANTS } from "@/constants/uploadLimits"
import { getAnonymousId } from "./getAnonymousId"
import { getUserId } from "@/utils/getUserId"
import useUserStore from "@/store/user/userStore"

export type CreateProductFnInput = {
  title: string
  description: string
  price?: number
  onStock?: number
  images?: ImageListType
  variants?: TProductVariantDraft[]
  manageLoading?: boolean
}

export type ProductDraftAssets = {
  price: number
  imageFiles: File[]
}

export type StripeProductDraft = {
  priceId: string
  productId: string
}

export function getFileExtensionFromContentType(contentType: string, fallbackFileName: string) {
  const contentTypeToExtension: Record<string, string> = {
    "image/avif": "avif",
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
  }

  return contentTypeToExtension[contentType] || fallbackFileName.split(".").pop() || "jpg"
}

export async function compressImageWithTinify(imageFile: File) {
  const { blob: compressedBlob, contentType } = await productsSDK.compressImage(imageFile)
  const baseName = imageFile.name.replace(/\.[^/.]+$/, "")
  const fileExtension = getFileExtensionFromContentType(contentType, imageFile.name)

  return new File([compressedBlob], `${baseName}.${fileExtension}`, { type: contentType })
}

export async function resolveProductPrice(title: string, description: string, price?: number) {
  if (price && price > 0) {
    return price
  }

  try {
    const data = await productsSDK.fetchSuggestedPrice({ title, description })

    if (data.price && data.price > 0) {
      return data.price
    }

    const priceData = await aiSDK.prompt(`
Product: ${title}.
Description: ${description}.
Estimate realistic USD price ONLY the number.
RULES:
- tiny adapters/connectors: realistic $1–$6
- basic 12V accessory: realistic $4–$15
- do NOT go above these ranges
    `)
    const aiRaw = priceData.aiMessage || ""
    const parsedPrice = parseFloat(aiRaw.replace(/[^0-9.]/g, "")) || 0

    return parsedPrice > 0 ? parsedPrice : 4.99
  } catch (error) {
    console.error("[createProduct] price estimation failed, falling back to default", {
      error: error instanceof Error ? error.message : String(error),
      title,
    })
    return 4.99
  }
}

export async function generateProductImageFile(title: string, description: string, t: TI18nFunction) {
  try {
    const generatedImage = await aiSDK.generateImageBuffer(`${title}. ${description}`)

    return new File([generatedImage.buffer], "generated_image.png", {
      type: generatedImage.contentType,
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error("[createProduct] AI image generation failed", { errorMessage, title })
    throw new Error(`${t("product.error.failed_to_generate_image")}: ${errorMessage}`)
  }
}

export async function resolveSourceProductImages(title: string, description: string, images: ImageListType | undefined, t: TI18nFunction) {
  if (images && images.length > MAX_PRODUCT_IMAGES) {
    throw new Error(t("product.warning.max_images_subtitle", { maxImages: MAX_PRODUCT_IMAGES }))
  }

  const uploadedImageFiles = (images || []).map(image => image.file).filter((file): file is File => Boolean(file))

  if (uploadedImageFiles.length > 0) {
    return uploadedImageFiles
  }

  return [await generateProductImageFile(title, description, t)]
}

export async function tinifyProductImages(imageFiles: File[]) {
  const compressionResults = await Promise.allSettled(imageFiles.map(imageFile => compressImageWithTinify(imageFile)))
  const compressionErrors = compressionResults
    .filter((result): result is PromiseRejectedResult => result.status === "rejected")
    .map(result => (result.reason instanceof Error ? result.reason.message : String(result.reason)))

  if (compressionErrors.length > 0) {
    throw new Error(`Tinify failed: ${compressionErrors.join(", ")}`)
  }

  return compressionResults
    .filter((result): result is PromiseFulfilledResult<File> => result.status === "fulfilled")
    .map(result => result.value)
}

export async function uploadProductImages(imageFiles: File[], t: TI18nFunction) {
  const userStore = useUserStore.getState()
  const uploadFolder = userStore.user?.id || getAnonymousId() || getUserId()
  const uploadBatchId = crypto.randomUUID()

  const uploadResults = await Promise.all(
    imageFiles.map(async (imageFile, index) => {
      const uploadResult = await uploadImageFn({
        t,
        imageFile,
        bucket: "public-images",
        folder: uploadFolder,
        suffix: `${uploadBatchId}_${index + 1}`,
        upsert: true,
      })

      if (typeof uploadResult === "string") {
        throw new Error(uploadResult)
      }

      return uploadResult.publicUrl
    }),
  )

  if (!uploadResults.length) {
    throw new Error("No images available for product")
  }

  return uploadResults
}

export async function createStripeProduct(
  title: string,
  description: string,
  price: number,
  images: string[],
  t: TI18nFunction,
): Promise<StripeProductDraft> {
  const stripeAmount = Math.max(1, Math.floor(price * 100))
  const stripeData = await productsSDK.addProduct({
    title,
    description,
    price: stripeAmount,
    images,
  })

  if (!stripeData.id || !stripeData.product) {
    throw new Error(t("product.error.failed_to_create_product_on_stripe"))
  }

  return {
    priceId: stripeData.id,
    productId: stripeData.product,
  }
}

export function resolveUploadedProductVariants(variants: TProductVariantDraft[] | undefined, imageUrls: string[]) {
  return (variants || [])
    .slice(0, MAX_PRODUCT_VARIANTS)
    .filter(variant => variant.label.trim() && imageUrls[variant.imageIndex])
    .map(
      (variant): TProductVariant => ({
        id: variant.id,
        label: variant.label.trim(),
        image_url: imageUrls[variant.imageIndex],
      }),
    )
}
