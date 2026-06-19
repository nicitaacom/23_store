"use client"

import Image from "next/image"
import { twMerge } from "tailwind-merge"
import { useState, useEffect } from "react"
import { BiImage } from "react-icons/bi"

interface OwnerProductImageProps {
  imgUrl: string
  className?: string
  alt?: string
}

export const OWNER_PRODUCT_MEDIA_WRAPPER_CLASSNAME =
  "mx-auto aspect-[4/3] w-full max-w-[480px] overflow-hidden rounded bg-foreground/[0.06] tablet:mx-0 tablet:max-w-none tablet:w-[233px] laptop:w-[267px] desktop:w-[333px]"

export function OwnerProductImage({ imgUrl, className, alt }: OwnerProductImageProps) {
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    setFailed(false)
  }, [imgUrl])

  const showFallback = failed || !imgUrl

  return (
    <figure className={twMerge("relative h-full w-full overflow-hidden bg-foreground/[0.06]", className)}>
      {showFallback ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 text-border-color/50">
          <BiImage size={28} />
          <span className="text-[10px] font-semibold uppercase tracking-widest">No image</span>
        </div>
      ) : (
        <Image
          key={imgUrl}
          className="h-full w-full max-w-full object-contain"
          src={imgUrl}
          alt={alt ?? "Product image"}
          width={480}
          height={360}
          priority
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          onError={() => setFailed(true)}
        />
      )}
    </figure>
  )
}
