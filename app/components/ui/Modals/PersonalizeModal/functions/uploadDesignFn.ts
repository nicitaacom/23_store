import { TDesignPlacement, TPrintArea } from "@/ts/product/TPersonalization"
import { TI18nFunction } from "@/ts/types/i18n/TI18nFunction"
import { getUserId } from "@/utils/getUserId"
import { personalizedDesignsSDK } from "@/sdk/PersonalizedDesignsSDK/PersonalizedDesignsSDK"
import { uploadImageFn } from "@/functions/uploadImageFn"

interface UploadDesignParams {
  t: TI18nFunction
  designFile: File
  productId: string
  variantId: string | null
  printArea: TPrintArea
  placement: TDesignPlacement
  sourceWidthPx: number
  sourceHeightPx: number
  effectiveDpi: number
}

/**
 * The design goes to storage as-is - no Tinify pass. Compression is right for catalog images, and
 * wrong here: the printer needs every pixel the buyer uploaded, and the DPI shown in the modal is
 * measured against that file.
 *
 * Returns the design id, or a string with the error (same contract as `uploadImageFn`).
 */
export async function uploadDesignFn({
  t,
  designFile,
  productId,
  variantId,
  printArea,
  placement,
  sourceWidthPx,
  sourceHeightPx,
  effectiveDpi,
}: UploadDesignParams): Promise<string | { designId: string }> {
  const userId = getUserId()

  const uploadImageResp = await uploadImageFn({
    t,
    imageFile: designFile,
    bucket: "23_product-personalozation-images",
    folder: `personalized/${userId}`,
    suffix: crypto.randomUUID(),
    upsert: true,
  })

  if (typeof uploadImageResp === "string") return uploadImageResp

  // The SDK throws on any non-ok status - among them the 503 the route answers with when the
  // 23_personalized_designs table has not been created yet. Returning that message keeps the string
  // contract above, so the modal shows it in a toast instead of staying stuck on "Adding...".
  try {
    const insertDBDesignResp = await personalizedDesignsSDK.insertDBDesign({
      user_id: userId,
      product_id: productId,
      variant_id: variantId,
      source_url: uploadImageResp.publicUrl,
      source_width_px: sourceWidthPx,
      source_height_px: sourceHeightPx,
      print_width_mm: printArea.widthMm,
      print_height_mm: printArea.heightMm,
      placement,
      effective_dpi: effectiveDpi,
    })

    if ("error" in insertDBDesignResp) return insertDBDesignResp.error

    return { designId: insertDBDesignResp.design_id }
  } catch (error) {
    return error instanceof Error ? error.message : String(error)
  }
}
