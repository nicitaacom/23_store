"use client"

import { useEffect, useRef } from "react"

export function useFocusVariantLabelAfterImageAdded(imageCount: number) {
  const variantLabelInputRef = useRef<HTMLInputElement>(null)
  const previousImageCountRef = useRef(imageCount)

  useEffect(() => {
    const hasAddedImage = imageCount > previousImageCountRef.current
    previousImageCountRef.current = imageCount
    if (!hasAddedImage) return

    const animationFrame = requestAnimationFrame(() => variantLabelInputRef.current?.focus())
    return () => cancelAnimationFrame(animationFrame)
  }, [imageCount])

  return variantLabelInputRef
}
