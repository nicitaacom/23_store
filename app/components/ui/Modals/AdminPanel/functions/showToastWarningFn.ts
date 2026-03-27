import useToast from "@/store/ui/useToast"
import { TI18nFunction } from "@/ts/types/i18n/TI18nFunction"
import { ErrorsType } from "react-images-uploading"
import { formatUploadFileSize, formatUploadResolution, MAX_IMAGE_FILE_SIZE_BYTES, MIN_IMAGE_RESOLUTION } from "@/constants/uploadLimits"

interface ShowToastWarningOptions {
  maxNumber?: number
  maxFileSize?: number
  minResolution?: {
    width: number
    height: number
  }
}

export function showToastWarningFn(t: TI18nFunction, errors: ErrorsType, options: ShowToastWarningOptions = {}) {
  const toast = useToast.getState()

  const maxImages = options.maxNumber ?? 5
  const maxFileSize = formatUploadFileSize(options.maxFileSize ?? MAX_IMAGE_FILE_SIZE_BYTES)
  const minResolution = formatUploadResolution(options.minResolution ?? MIN_IMAGE_RESOLUTION)

  if (errors?.acceptType) {
    return toast.show("warning", t("product.warning.add_file_extension_title"), t("product.warning.add_file_extension_subtitle"))
  } else if (errors?.maxFileSize) {
    return toast.show(
      "warning",
      t("product.warning.max_file_size_title", { maxFileSize }),
      t("product.warning.max_file_size_subtitle", { maxFileSize }),
    )
  } else if (errors?.maxNumber) {
    return toast.show(
      "warning",
      t("product.warning.max_images_title", { maxImages }),
      t("product.warning.max_images_subtitle", { maxImages }),
    )
  } else if (errors?.resolution) {
    return toast.show(
      "warning",
      t("product.warning.use_higer_resolution_title"),
      t("product.warning.use_higer_resolution_subtitle", { minResolution }),
    )
  }
}
