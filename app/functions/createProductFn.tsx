import { TI18nFunction } from "@/ts/types/i18n/TI18nFunction"
import { TProductDB } from "@/ts/product/TProductDB"
import {
  TCreateProductFnInput,
  createStripeProduct,
  resolveProductPrice,
  resolveSourceProductImages,
  resolveUploadedPersonalization,
  resolveUploadedProductVariants,
  tinifyProductImages,
  uploadProductImages,
} from "./createProductHelpers"
import { createRawProductTranslations, normalizeProductImageUrls } from "@/utils/product"
import { getUserId } from "@/utils/getUserId"
import { productsSDK } from "@/sdk/ProductsSDK/ProductsSDK"
import { useLoading } from "@/store/ui/useLoading"

/**
 * Creates a product through the full creation pipeline.
 *
 * Steps:
 * 1. Validate and resolve the uploaded source images.
 * 2. Tinify every image and fail if compression fails.
 * 3. Resolve a base product price, preferring the first variant price.
 * 4. Create the Stripe product and price, which is what mints the productId.
 * 5. Upload all tinified images into that productId's folder and fail if upload fails.
 * 6. Resolve variants against uploaded images.
 * 7. Insert the product into Supabase immediately and hand translation off to Lambda.
 * 8. Put the uploaded URLs on the Stripe product, which had none when step 4 created it.
 *
 * Stripe runs before the upload because the productId it returns IS the image folder - building the
 * folder from anything else would leave a product's images spread over a folder shared with every
 * other product. See plan-22 and app/functions/dev_readme-create-product.md.
 *
 * We use Lambda for translation because Vercel server functions can time out
 * around 60 seconds, while the translation job may take 3-5 minutes.
 */
export async function createProductFn(t: TI18nFunction, input: TCreateProductFnInput) {
  const { setIsLoading } = useLoading.getState()
  const { title, description, price, onStock, images, variants, personalization, manageLoading = true, category_id } = input

  if (manageLoading) {
    setIsLoading(true)
  }

  try {
    const sourceImageFiles = await resolveSourceProductImages(images)
    const tinifiedImageFiles = await tinifyProductImages(sourceImageFiles)
    const resolvedPrice = await resolveProductPrice(title, description, price, variants)
    const createStripeProductResp = await createStripeProduct(title, description, resolvedPrice, t)
    const uploadedImageUrls = normalizeProductImageUrls(
      await uploadProductImages(tinifiedImageFiles, t, createStripeProductResp.productId, title),
    )

    if (!uploadedImageUrls.length) {
      throw new Error("No images available for product")
    }

    const resolvedVariants = resolveUploadedProductVariants(variants, uploadedImageUrls)
    const resolvedPersonalization = resolveUploadedPersonalization(personalization, uploadedImageUrls)
    const userId = getUserId()

    const createProductResponse = await productsSDK.translateAndInsertInDB({
      id: createStripeProductResp.productId,
      price_id: createStripeProductResp.priceId,
      title,
      description,
      price: resolvedPrice,
      on_stock: onStock ?? 0,
      img_url: uploadedImageUrls,
      variants: resolvedVariants,
      personalization: resolvedPersonalization,
      category_id: category_id ?? null,
    })

    if (!createProductResponse.ok) {
      throw new Error(createProductResponse.error || t("product.error.db_insert_failed"))
    }

    // Stripe's product was created before the images existed, so its gallery is filled in here. The
    // shop itself reads 23_products.img_url, which the insert above already holds, so a failure at
    // this point leaves only Stripe's own preview behind - reported, not thrown over a live product.
    try {
      await productsSDK.updateProduct({ productId: createStripeProductResp.productId, images: uploadedImageUrls })
    } catch (error) {
      console.error("createProductFn: product images did not reach Stripe", error instanceof Error ? error.message : error)
    }

    return {
      id: createStripeProductResp.productId,
      price_id: createStripeProductResp.priceId,
      owner_id: userId,
      translations: createRawProductTranslations(title, description),
      price: resolvedPrice,
      on_stock: onStock ?? 0,
      img_url: uploadedImageUrls,
      variants: resolvedVariants,
      personalization: resolvedPersonalization,
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
