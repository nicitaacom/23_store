import { ImageListType } from "react-images-uploading"

import { MAX_IMAGE_FILE_SIZE_BYTES, MAX_PRODUCT_IMAGES, MIN_IMAGE_RESOLUTION } from "@/constants/uploadLimits"

interface ReadPastedImagesResult {
  images: ImageListType
  errors: { maxFileSize?: boolean; maxNumber?: boolean; resolution?: boolean }
  rejectedFiles: ImageListType
}

// `data_url` has to be a base64 string because that is what the create-product pipeline sends on
// submit - an object URL would be gone by then.
async function toDataUrl(file: File) {
  const bytes = new Uint8Array(await file.arrayBuffer())
  const chunkSize = 8192
  let binary = ""

  for (let index = 0; index < bytes.length; index += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunkSize))
  }

  return `data:${file.type};base64,${btoa(binary)}`
}

async function getImageResolution(file: File) {
  try {
    const bitmap = await createImageBitmap(file)
    const imageResolution = { width: bitmap.width, height: bitmap.height }
    bitmap.close()
    return imageResolution
  } catch {
    return { width: 0, height: 0 }
  }
}

/**
 * `react-images-uploading` validates what its own file picker and drop zone receive - a paste never
 * reaches it, so the same limits (file size, resolution, how many images fit) are applied here and
 * the rejected files come back shaped for `showToastWarningFn`.
 */
export async function readPastedImages(files: File[], currentAmount: number): Promise<ReadPastedImagesResult> {
  const images: ImageListType = []
  const rejectedFiles: ImageListType = []
  const errors: ReadPastedImagesResult["errors"] = {}

  for (const file of files) {
    if (currentAmount + images.length >= MAX_PRODUCT_IMAGES) {
      errors.maxNumber = true
      break
    }

    if (file.size > MAX_IMAGE_FILE_SIZE_BYTES) {
      errors.maxFileSize = true
      rejectedFiles.push({ file })
      continue
    }

    const getImageResolutionResp = await getImageResolution(file)
    if (
      getImageResolutionResp.width < MIN_IMAGE_RESOLUTION.width ||
      getImageResolutionResp.height < MIN_IMAGE_RESOLUTION.height
    ) {
      errors.resolution = true
      rejectedFiles.push({ file })
      continue
    }

    images.push({ file, data_url: await toDataUrl(file) })
  }

  return { images, errors, rejectedFiles }
}
