import useToast from "@/store/ui/useToast"
import { ErrorsType } from "react-images-uploading"

export function showToastWarningFn(errors: ErrorsType, maxNumber?: number) {
  const toast = useToast.getState()

  const maxImages = maxNumber ?? 5

  if (errors?.acceptType) {
    return toast.show("warning", "Add file extention", "Please add file.extention like .jpg or .png or .avif or .webp")
  } else if (errors?.maxFileSize) {
    return toast.show("warning", "Max file size is 1MB", 'Max is 1MB - google "tinify png or jpg"')
  } else if (errors?.maxNumber) {
    return toast.show("warning", `Max ${maxImages} images`, `Please use max ${maxImages} product images`)
  } else if (errors?.resolution) {
    return toast.show("warning", "Use higher resolution", "Min 1000 width and 500 height 1000x500")
  }
}
