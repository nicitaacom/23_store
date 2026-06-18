"use client"

import Image from "next/image"
import { twMerge } from "tailwind-merge"
import { useState, useEffect } from "react"
import { BiImage, BiPlus } from "react-icons/bi"

interface OwnerProductImageProps {
  imgUrl: string
  className?: string
  alt?: string
  onUploadClick?: () => void
}

export const OWNER_PRODUCT_MEDIA_WRAPPER_CLASSNAME =
  "mx-auto aspect-[4/3] w-full max-w-[480px] overflow-hidden rounded bg-foreground/[0.06] tablet:mx-0 tablet:max-w-none tablet:w-[233px] laptop:w-[267px] desktop:w-[333px]"

export function OwnerProductImage({ imgUrl, className, alt, onUploadClick }: OwnerProductImageProps) {
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    setFailed(false)
  }, [imgUrl])

  const showFallback = failed || !imgUrl

  return (
    <figure className={twMerge("relative h-full w-full overflow-hidden bg-foreground/[0.06]", className)}>
      {showFallback ? (
        <div
          className={twMerge(
            "absolute inset-0 flex flex-col items-center justify-center gap-1.5 text-border-color/50",
            onUploadClick && "cursor-pointer transition-colors hover:bg-foreground/10 hover:text-border-color/80",
          )}
          onClick={onUploadClick ? (e) => { e.stopPropagation(); onUploadClick() } : undefined}>
          {onUploadClick ? (
            <>
              <div className="flex h-9 w-9 items-center justify-center rounded-full border border-dashed border-border-color/40">
                <BiPlus size={20} />
              </div>
              <span className="text-[10px] font-semibold uppercase tracking-widest">Add image</span>
            </>
          ) : (
            <>
              <BiImage size={28} />
              <span className="text-[10px] font-semibold uppercase tracking-widest">No image</span>
            </>
          )}
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
