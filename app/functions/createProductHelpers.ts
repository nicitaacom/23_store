import { ImageListType } from "react-images-uploading"

import { TProductVariant, TProductVariantDraft } from "@/ts/product/TProductVariant"
import { TI18nFunction } from "@/ts/types/i18n/TI18nFunction"
import { getAnonymousId } from "./getAnonymousId"
import { uploadImageFn } from "./uploadImageFn"
import { aiSDK } from "@/sdk/AISDK/AISDK"
import { getUserId } from "@/utils/getUserId"
import { productsSDK } from "@/sdk/ProductsSDK/ProductsSDK"
import useUserStore from "@/store/user/userStore"
import { MAX_PRODUCT_DESCRIPTION_LENGTH, MAX_PRODUCT_TITLE_LENGTH, MIN_PRODUCT_TITLE_LENGTH } from "@/constants/productLimits"
import { MAX_PRODUCT_IMAGES, MAX_PRODUCT_VARIANTS } from "@/constants/uploadLimits"
import {
  PRODUCT_DESCRIPTION_INVALID_CHARACTER_REGEX,
  PRODUCT_DESCRIPTION_PATTERN,
  PRODUCT_TITLE_HAS_LETTER_REGEX,
  PRODUCT_TITLE_INVALID_CHARACTER_REGEX,
  PRODUCT_TITLE_MUST_START_REGEX,
  getInvalidCharacterDetails,
} from "@/utils/productValidation"

export type TCreateProductFnInput = {
  title: string
  description: string
  price?: number
  onStock?: number
  images?: ImageListType
  variants?: TProductVariantDraft[]
  manageLoading?: boolean
  category_id?: string | null
}

export type TProductDraftAssets = {
  price: number
  imageFiles: File[]
}

export type TStripeProductDraft = {
  priceId: string
  productId: string
}

export function getDefaultVariantPrice(
  variants: Pick<TProductVariant, "price">[] | Pick<TProductVariantDraft, "price">[] | undefined,
) {
  const firstVariantPrice = variants?.[0]?.price
  return typeof firstVariantPrice === "number" && Number.isFinite(firstVariantPrice) && firstVariantPrice > 0
    ? firstVariantPrice
    : null
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
  const { compressedImageFile, contentType } = await productsSDK.compressImage(imageFile)
  const baseName = imageFile.name.replace(/\.[^/.]+$/, "")
  const fileExtension = getFileExtensionFromContentType(contentType, imageFile.name)

  return new File([compressedImageFile], `${baseName}.${fileExtension}`, { type: contentType })
}

export async function resolveProductPrice(
  title: string,
  description: string,
  price?: number,
  variants?: Pick<TProductVariant, "price">[] | Pick<TProductVariantDraft, "price">[],
) {
  if (price && price > 0) {
    return price
  }

  const defaultVariantPrice = getDefaultVariantPrice(variants)
  if (defaultVariantPrice) {
    return defaultVariantPrice
  }

  try {
    const selectSuggestedPriceResp = await productsSDK.selectSuggestedPrice({ title, description })

    if (selectSuggestedPriceResp.price && selectSuggestedPriceResp.price > 0) {
      return selectSuggestedPriceResp.price
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

export async function resolveSourceProductImages(images: ImageListType | undefined) {
  if (images && images.length > MAX_PRODUCT_IMAGES) {
    throw new Error(`Please use max ${MAX_PRODUCT_IMAGES} product images`)
  }

  const uploadedImageFiles = (images || []).map(image => image.file).filter((file): file is File => Boolean(file))

  if (uploadedImageFiles.length > 0) {
    return uploadedImageFiles
  }

  throw new Error("At least 1 image is required")
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
      const response = await uploadImageFn({
        t,
        imageFile,
        bucket: "23_public-images",
        folder: uploadFolder,
        suffix: `${uploadBatchId}_${index + 1}`,
        upsert: true,
      })

      if (typeof response === "string") {
        throw new Error(response)
      }

      return response.publicUrl
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
): Promise<TStripeProductDraft> {
  const trimmedTitle = title.trim()
  const stripeAmount = Math.max(1, Math.floor(price * 100))
  const trimmedDescription = description.trim()

  if (!trimmedTitle) {
    throw new Error("Title is required")
  }

  if (trimmedTitle.length < MIN_PRODUCT_TITLE_LENGTH) {
    throw new Error(`Title is too short - minimum ${MIN_PRODUCT_TITLE_LENGTH} characters`)
  }

  if (trimmedTitle.length > MAX_PRODUCT_TITLE_LENGTH) {
    throw new Error(t("product.title_too_long", { current: trimmedTitle.length, max: MAX_PRODUCT_TITLE_LENGTH }))
  }

  if (!PRODUCT_TITLE_HAS_LETTER_REGEX.test(trimmedTitle)) {
    throw new Error(t("product.title_must_contain_letter"))
  }

  if (!PRODUCT_TITLE_MUST_START_REGEX.test(trimmedTitle)) {
    throw new Error(t("product.title_must_start_alphanumeric"))
  }

  if (PRODUCT_TITLE_INVALID_CHARACTER_REGEX.test(trimmedTitle)) {
    throw new Error(t("product.title_required"))
  }

  if (trimmedDescription.length > MAX_PRODUCT_DESCRIPTION_LENGTH) {
    throw new Error(t("product.description_too_long", { max: MAX_PRODUCT_DESCRIPTION_LENGTH }))
  }

  if (trimmedDescription && !PRODUCT_DESCRIPTION_PATTERN.test(trimmedDescription)) {
    const invalidCharacterDetails = getInvalidCharacterDetails(trimmedDescription, PRODUCT_DESCRIPTION_INVALID_CHARACTER_REGEX)
    if (invalidCharacterDetails) {
      throw new Error(t("product.description_invalid_character", invalidCharacterDetails))
    }

    throw new Error(t("product.subtitle_required"))
  }

  const response = await productsSDK.addProduct({
    title: trimmedTitle,
    ...(trimmedDescription ? { description: trimmedDescription } : {}),
    price: stripeAmount,
    images,
  })

  if (!response.id || !response.product) {
    throw new Error(t("product.error.failed_to_create_product_on_stripe"))
  }

  return {
    priceId: response.id,
    productId: response.product,
  }
}

export function resolveUploadedProductVariants(variants: TProductVariantDraft[] | undefined, imageUrls: string[]) {
  return (variants || [])
    .slice(0, MAX_PRODUCT_VARIANTS)
    .filter(variant => variant.label.trim() && imageUrls[variant.imageIndex] && variant.price > 0)
    .map(
      (variant): TProductVariant => ({
        id: variant.id,
        label: variant.label.trim(),
        image_url: imageUrls[variant.imageIndex],
        price: variant.price,
        quantity: variant.quantity,
      }),
    )
}
