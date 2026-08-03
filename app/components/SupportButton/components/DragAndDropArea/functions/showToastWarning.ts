import { ErrorsType, ImageListType } from "react-images-uploading"

import { TI18nFunction } from "@/ts/types/i18n/TI18nFunction"
import {
  formatUploadFileSize,
  formatUploadResolution,
  MAX_IMAGE_FILE_SIZE_BYTES,
  MIN_IMAGE_RESOLUTION,
} from "@/constants/uploadLimits"
import { getInvalidUploadedImageResolution } from "@/utils/getUploadedImageResolution"
import { getOversizedImageWarningValues } from "@/utils/getOversizedImageWarningValues"
import useToast from "@/store/ui/useToast"

interface ShowToastWarningOptions {
  maxNumber?: number
  maxFileSize?: number
  minResolution?: {
    width: number
    height: number
  }
}

// Same `product.warning.*` keys as the admin variant (AdminPanel/functions/showToastWarningFn.ts):
// the wording is about the image file itself, so it reads right in both the product form and the
// support chat, and one set of keys stays translated in all 4 locales.
export async function showToastWarningFn(
  t: TI18nFunction,
  errors: ErrorsType,
  options: ShowToastWarningOptions = {},
  files?: ImageListType,
) {
  const toast = useToast.getState()

  const maxImages = options.maxNumber ?? 5
  const maxFileSizeBytes = options.maxFileSize ?? MAX_IMAGE_FILE_SIZE_BYTES
  const maxFileSize = formatUploadFileSize(maxFileSizeBytes)
  const minResolution = formatUploadResolution(options.minResolution ?? MIN_IMAGE_RESOLUTION)

  if (errors?.acceptType) {
    return toast.show("warning", t("product.warning.add_file_extension_title"), t("product.warning.add_file_extension_subtitle"))
  } else if (errors?.maxFileSize) {
    const getOversizedImageWarningValuesResp = await getOversizedImageWarningValues(files, maxFileSizeBytes)
    return toast.show(
      "warning",
      t("product.warning.max_file_size_title", { maxFileSize }),
      getOversizedImageWarningValuesResp
        ? t("product.warning.max_file_size_details", getOversizedImageWarningValuesResp)
        : t("product.warning.max_file_size_subtitle", { maxFileSize }),
    )
  } else if (errors?.maxNumber) {
    return toast.show(
      "warning",
      t("product.warning.max_images_title", { maxImages }),
      t("product.warning.max_images_subtitle", { maxImages }),
    )
  } else if (errors?.resolution) {
    const getInvalidUploadedImageResolutionResp = await getInvalidUploadedImageResolution(
      files,
      options.minResolution ?? MIN_IMAGE_RESOLUTION,
    )
    const uploadedResolution = getInvalidUploadedImageResolutionResp
      ? formatUploadResolution(getInvalidUploadedImageResolutionResp)
      : null

    return toast.show(
      "warning",
      t("product.warning.use_higer_resolution_title"),
      uploadedResolution
        ? t("product.warning.use_higer_resolution_subtitle_with_uploaded", { uploadedResolution, minResolution })
        : t("product.warning.use_higer_resolution_subtitle", { minResolution }),
    )
  }
}
