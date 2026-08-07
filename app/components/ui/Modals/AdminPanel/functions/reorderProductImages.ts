import { arrayMove } from "@dnd-kit/sortable"

import type { TSortableProductImage } from "@/ts/product/TSortableProductImage"

export function reorderProductImages(
  images: TSortableProductImage[],
  activeImageIndex: number,
  sourceId: string,
  destinationId: string,
) {
  const sourceIndex = images.findIndex(image => image.sortableId === sourceId)
  const destinationIndex = images.findIndex(image => image.sortableId === destinationId)
  if (sourceIndex < 0 || destinationIndex < 0 || sourceIndex === destinationIndex) return { images, activeImageIndex }

  const activeImageId = images[activeImageIndex]?.sortableId
  const reorderedImages = arrayMove(images, sourceIndex, destinationIndex)
  const reorderedActiveImageIndex = activeImageId
    ? reorderedImages.findIndex(image => image.sortableId === activeImageId)
    : Math.min(activeImageIndex, reorderedImages.length - 1)

  return {
    images: reorderedImages,
    activeImageIndex: Math.max(0, reorderedActiveImageIndex),
  }
}
