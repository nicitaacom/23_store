import { ImageListType } from "react-images-uploading"

import { formatUploadFileSize, formatUploadResolution } from "@/constants/uploadLimits"
import { getUploadedImageResolution } from "@/utils/getUploadedImageResolution"

export async function getOversizedImageWarningValues(files: ImageListType | undefined, maxFileSizeBytes: number) {
  const oversizedImage = (files ?? []).find(image => image.file && image.file.size > maxFileSizeBytes)
  if (!oversizedImage?.file) return null

  const getUploadedImageResolutionResp = await getUploadedImageResolution([oversizedImage])
  const isPng = oversizedImage.file.type === "image/png" || oversizedImage.file.name.toLowerCase().endsWith(".png")

  return {
    compressionUrl: isPng ? "https://tinypng.com/" : "https://tinyjpg.com/",
    fileName: oversizedImage.file.name,
    fileSize: formatUploadFileSize(oversizedImage.file.size),
    maxFileSize: formatUploadFileSize(maxFileSizeBytes),
    resolution: getUploadedImageResolutionResp ? formatUploadResolution(getUploadedImageResolutionResp) : "?x?",
  }
}
