import useToast from "@/store/ui/useToast"
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

export function showToastWarningFn(errors: ErrorsType, options: ShowToastWarningOptions = {}) {
  const toast = useToast.getState()

  const maxImages = options.maxNumber ?? 5
  const maxFileSize = formatUploadFileSize(options.maxFileSize ?? MAX_IMAGE_FILE_SIZE_BYTES)
  const minResolution = formatUploadResolution(options.minResolution ?? MIN_IMAGE_RESOLUTION)

  if (errors?.acceptType) {
    return toast.show("warning", "Add file extention", "Please add file.extention like .jpg or .png or .avif or .webp")
  } else if (errors?.maxFileSize) {
    return toast.show("warning", `Max file size is ${maxFileSize}`, `Please upload an image that is ${maxFileSize} or smaller.`)
  } else if (errors?.maxNumber) {
    return toast.show("warning", `Max ${maxImages} images`, `Please use max ${maxImages} images`)
  } else if (errors?.resolution) {
    return toast.show("warning", "Use higher resolution", `Minimum required resolution is ${minResolution}px.`)
  }
}
