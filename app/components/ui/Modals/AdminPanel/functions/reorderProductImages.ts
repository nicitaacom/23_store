import { arrayMove } from "@dnd-kit/sortable"

import type { TSortableProductImage } from "@/ts/product/TSortableProductImage"

export function reorderProductImages(
  images: TSortableProductImage[],
  activeImageIndex: number,
  sourceId: string,
  targetId: string,
) {
  const sourceIndex = images.findIndex(image => image.sortableId === sourceId)
  const targetIndex = images.findIndex(image => image.sortableId === targetId)
  if (sourceIndex < 0 || targetIndex < 0 || sourceIndex === targetIndex) return { images, activeImageIndex }

  const activeImageId = images[activeImageIndex]?.sortableId
  const reorderedImages = arrayMove(images, sourceIndex, targetIndex)
  const reorderedActiveImageIndex = activeImageId
    ? reorderedImages.findIndex(image => image.sortableId === activeImageId)
    : Math.min(activeImageIndex, reorderedImages.length - 1)

  return {
    images: reorderedImages,
    activeImageIndex: Math.max(0, reorderedActiveImageIndex),
  }
}
