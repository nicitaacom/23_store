"use client"

import { useState } from "react"
import Image, { ImageProps } from "next/image"
import { twMerge } from "tailwind-merge"

import { useI18n } from "@/locales/client"

const DEFAULT_FALLBACK_SRC = "/no-image-fallback.png"

interface ImageWithFallbackProps extends Omit<ImageProps, "src" | "onError"> {
  src: string | undefined
  fallbackSrc?: string
  /** Render the i18n "no image found" label under the fallback image */
  showLabel?: boolean
  /** Wrapper className applied only when the fallback (with label) is shown */
  fallbackWrapperClassName?: string
  /** className applied to the <Image> when the fallback is shown (overrides className) */
  fallbackClassName?: string
}

/**
 * next/image wrapper that swaps to a fallback image when the source is missing or
 * fails to fetch correctly. Single source of truth for product image fallback across the app.
 */
// http://localhost:6006/?path=/story/ui-feedback-toastexample--success-toast
export function ImageWithFallback({
  src,
  fallbackSrc = DEFAULT_FALLBACK_SRC,
  showLabel = false,
  fallbackWrapperClassName,
  fallbackClassName,
  className,
  alt,
  ...props
}: ImageWithFallbackProps) {
  const t = useI18n()
  const [failedSrc, setFailedSrc] = useState<string | undefined>()
  const showFallback = failedSrc === src || !src

  const image = (
    <Image
      className={twMerge(className, showFallback && fallbackClassName)}
      {...props}
      src={showFallback ? fallbackSrc : (src as string)}
      alt={alt}
      onError={() => setFailedSrc(src)}
    />
  )

  // Without a label there's nothing to wrap — render the image directly
  if (!showLabel) return image

  return (
    <div className={twMerge(showFallback && fallbackWrapperClassName)}>
      {image}
      {showFallback && <p className="text-center text-xs text-subTitle">{t("product.no_image_found")}</p>}
    </div>
  )
}
