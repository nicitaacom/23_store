import { ImageListType } from "react-images-uploading"

interface ImageResolution {
  width: number
  height: number
}

async function getImageResolution(file: File): Promise<ImageResolution | null> {
  if (typeof window === "undefined") return null

  return new Promise(resolve => {
    const objectUrl = URL.createObjectURL(file)
    const image = new window.Image()

    const cleanup = () => {
      URL.revokeObjectURL(objectUrl)
    }

    image.onload = () => {
      const width = image.naturalWidth || image.width
      const height = image.naturalHeight || image.height

      cleanup()
      resolve(width > 0 && height > 0 ? { width, height } : null)
    }

    image.onerror = () => {
      cleanup()
      resolve(null)
    }

    image.src = objectUrl
  })
}

export async function getUploadedImageResolution(files?: ImageListType): Promise<ImageResolution | null> {
  for (const image of files ?? []) {
    if (!image.file) continue

    const resolution = await getImageResolution(image.file)

    if (resolution) return resolution
  }

  return null
}

export async function getInvalidUploadedImageResolution(
  files: ImageListType | undefined,
  minResolution: ImageResolution,
): Promise<ImageResolution | null> {
  for (const image of files ?? []) {
    if (!image.file) continue

    const resolution = await getImageResolution(image.file)
    if (!resolution) continue

    if (resolution.width < minResolution.width || resolution.height < minResolution.height) {
      return resolution
    }
  }

  return null
}
