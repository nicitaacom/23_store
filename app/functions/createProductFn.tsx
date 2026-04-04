import { useLoading } from "@/store/ui/useLoading"
import { TProductDB } from "@/ts/product/TProductDB"
import { TI18nFunction } from "@/ts/types/i18n/TI18nFunction"
import { getUserId } from "@/utils/getUserId"
import { createRawProductTranslations, normalizeProductImageUrls } from "@/utils/product"
import { productsSDK } from "@/sdk/ProductsSDK/ProductsSDK"
import {
  CreateProductFnInput,
  createStripeProduct,
  resolveProductPrice,
  resolveSourceProductImages,
  resolveUploadedProductVariants,
  tinifyProductImages,
  uploadProductImages,
} from "./createProductHelpers"

/**
 * Creates a product through the full creation pipeline.
 *
 * Steps:
 * 1. Resolve a price when one was not provided.
 * 2. Resolve source images, generating one with AI when none were provided.
 * 3. Tinify every image and fail if compression fails.
 * 4. Upload all tinified images and fail if upload fails.
 * 5. Create the Stripe product and price with uploaded images.
 * 6. Invoke the Lambda asynchronously so it can translate, insert into Supabase, and notify clients.
 */
export async function createProductFn(t: TI18nFunction, input: CreateProductFnInput) {
  const { setIsLoading } = useLoading.getState()
  const { title, description, price, onStock, images, variants, manageLoading = true } = input

  if (manageLoading) {
    setIsLoading(true)
  }

  try {
    const resolvedPrice = await resolveProductPrice(title, description, price)
    const sourceImageFiles = await resolveSourceProductImages(title, description, images, t)
    const tinifiedImageFiles = await tinifyProductImages(sourceImageFiles)
    const uploadedImageUrls = normalizeProductImageUrls(await uploadProductImages(tinifiedImageFiles, t))

    if (!uploadedImageUrls.length) {
      throw new Error("No images available for product")
    }

    const resolvedVariants = resolveUploadedProductVariants(variants, uploadedImageUrls)
    const stripeProduct = await createStripeProduct(title, description, resolvedPrice, uploadedImageUrls, t)
    const userId = getUserId()

    const lambdaResponse = await productsSDK.translateAndInsertInDB({
      id: stripeProduct.productId,
      price_id: stripeProduct.priceId,
      owner_id: userId,
      title,
      description,
      price: resolvedPrice,
      on_stock: onStock ?? 0,
      img_url: uploadedImageUrls,
      variants: resolvedVariants,
    })

    if (!lambdaResponse.ok) {
      throw new Error(lambdaResponse.error || t("product.error.db_insert_failed"))
    }

    return {
      id: stripeProduct.productId,
      price_id: stripeProduct.priceId,
      owner_id: userId,
      translations: createRawProductTranslations(title, description),
      price: resolvedPrice,
      on_stock: onStock ?? 0,
      img_url: uploadedImageUrls,
      variants: resolvedVariants,
    } as TProductDB
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error("createProductFn error:", errorMessage)
    throw new Error(errorMessage)
  } finally {
    if (manageLoading) {
      setIsLoading(false)
    }
  }
}
