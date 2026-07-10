"use client"

import { twMerge } from "tailwind-merge"

import { ImageWithFallback } from "@/components/ui"

interface OwnerProductImageProps {
  imgUrl: string
  className?: string
  alt?: string
}

export function OwnerProductImage({ imgUrl, className, alt }: OwnerProductImageProps) {
  return (
    <figure className={twMerge("relative w-full overflow-hidden bg-foreground/[0.06]", className)}>
      <ImageWithFallback
        key={imgUrl}
        className="h-auto w-full max-w-full object-contain"
        showLabel
        fallbackWrapperClassName="absolute inset-0 flex flex-col items-center justify-center gap-1.5"
        fallbackClassName="h-4/5 w-auto"
        src={imgUrl}
        alt={alt ?? "Product image"}
        width={480}
        height={360}
        priority
        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
      />
    </figure>
  )
}
