import { TI18nFunction } from "@/ts/types/i18n/TI18nFunction"
import { TBuckets } from "@/ts/types/TBuckets"
import { slugifyFileNameForBucket } from "./support/image/slugifyFileNameForBucket"
import { storageSDK } from "@/sdk/StorageSDK/StorageSDK"

interface UploadImageParams {
  t: TI18nFunction
  imageFile: File
  bucket: TBuckets
  folder?: string
  fileName?: string
  upsert?: boolean
}

/**
 *
 * @param imageFile - File type (make sure it exist and not undefined - if so - return string (error message))
 * @param folder - folder (category) e.g Main dishes
 * @param fileName - the whole name to store the file under, already slugged, when the file's own
 *   name says nothing about it: a product image is named after the product title
 *   (slivki-30pct-1.jpg) and a pasted chat image after the moment it arrived
 *   (2026-07-29_at_22-19-54.png), because a paste always arrives as image.png
 * @returns - publicUrl for image
 * NOTE: To avoid "Only serializable objects, and a few built-ins, can be passed to Server Actions" error - make sure that it is NOT server action
 * Because as I undertand it don't like that fact that I pass File here
 */
export async function uploadImageFn({
  t,
  imageFile,
  bucket,
  folder,
  fileName,
  upsert = false,
}: UploadImageParams): Promise<string | { publicUrl: string }> {
  if (!imageFile) return "Image file is missing"

  const cleanedFileName = fileName ? [fileName] : slugifyFileNameForBucket(t, imageFile.name)
  if (typeof cleanedFileName === "string") return cleanedFileName

  try {
    const response = await storageSDK.upload({
      bucket,
      filename: cleanedFileName[0],
      folder,
      entityId: bucket === "23_product-images" || bucket === "23_product-personalization-images" ? folder?.split("/")[1] : undefined,
      contentType: imageFile.type || "application/octet-stream",
      size: imageFile.size,
      upsert,
    }, imageFile)
    return { publicUrl: response.publicUrl }
  } catch (error) {
    return error instanceof Error ? error.message : String(error)
  }
}
