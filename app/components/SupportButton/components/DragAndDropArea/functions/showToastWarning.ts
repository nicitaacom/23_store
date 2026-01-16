import useToast from "@/store/ui/useToast"
import { ErrorsType } from "react-images-uploading"

export function showToastWarningFn(errors: ErrorsType, maxNumber?: number) {
  const toast = useToast.getState()

  const maxImages = maxNumber ?? 5

  if (errors?.acceptType) {
    return toast.show("warning", "Add file extention", "Please add file.extention like .jpg or .png or .avif or .webp")
  } else if (errors?.maxFileSize) {
    return toast.show(
      "warning",
      "Max file size is 4MB",
      "4MB it's more then enough for 4K image - consider using tiny png/jpg",
    )
  } else if (errors?.maxNumber) {
    return toast.show("warning", `Max ${maxImages} images`, `Please use max ${maxImages} images`)
  } else if (errors?.resolution) {
    return toast.show("warning", "Use higher resolution", "You may upscale image online")
  }
}
