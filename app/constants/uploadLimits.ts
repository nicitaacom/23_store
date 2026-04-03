export const MIN_IMAGE_RESOLUTION = {
  width: 512,
  height: 512,
} as const

export const MAX_IMAGE_FILE_SIZE_BYTES = 1024 * 1024
export const MAX_PRODUCT_IMAGES = 33
export const MAX_PRODUCT_VARIANTS = 32
export const STRIPE_MAX_PRODUCT_IMAGES = 8

export function formatUploadResolution({ width, height }: { width: number; height: number }) {
  return `${width}x${height}`
}

export function formatUploadFileSize(bytes: number) {
  const mb = bytes / (1024 * 1024)

  if (Number.isInteger(mb)) {
    return `${mb}MB`
  }

  return `${mb.toFixed(2).replace(/\.?0+$/, "")}MB`
}
