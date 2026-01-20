import useToast from "@/store/ui/useToast"
import { TI18nFunction } from "@/ts/types/i18n/TI18nFunction"
import { ErrorsType } from "react-images-uploading"

export function showToastWarningFn(t: TI18nFunction, errors: ErrorsType, maxNumber?: number) {
  const toast = useToast.getState()

  const maxImages = maxNumber ?? 5

  if (errors?.acceptType) {
    return toast.show("warning", t("product.warning.add_file_extension_title"), t("product.warning.add_file_extension_subtitle"))
  } else if (errors?.maxFileSize) {
    return toast.show("warning", t("product.warning.max_file_size_title"), t("product.warning.max_file_size_subtitle"))
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
      t("product.warning.use_higer_resolution_subtitle"),
    )
  }
}
