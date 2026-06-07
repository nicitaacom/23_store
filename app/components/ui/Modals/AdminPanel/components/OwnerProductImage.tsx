"use client"

import Image from "next/image"
import { twMerge } from "tailwind-merge"
import { useState } from "react"
import { BiImage } from "react-icons/bi"

interface OwnerProductImageProps {
  imgUrl: string
  className?: string
  alt?: string
}

export const OWNER_PRODUCT_MEDIA_WRAPPER_CLASSNAME =
  "mx-auto aspect-[4/3] w-full max-w-[480px] overflow-hidden rounded bg-foreground/[0.06] tablet:mx-0 tablet:max-w-none tablet:w-[233px] laptop:w-[267px] desktop:w-[333px]"

export function OwnerProductImage({ imgUrl, className, alt }: OwnerProductImageProps) {
  const [status, setStatus] = useState<"loading" | "loaded" | "error">("loading")

  return (
    <figure className={twMerge("relative h-full w-full overflow-hidden bg-foreground/[0.06]", className)}>
      {/* Fallback shown while loading or on error */}
      {status !== "loaded" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 text-border-color/50">
          {status === "error" ? (
            <>
              <BiImage size={28} />
              <span className="text-[10px] font-semibold uppercase tracking-widest">No image</span>
            </>
          ) : (
            <div className="h-8 w-8 animate-pulse rounded-full bg-border-color/20" />
          )}
        </div>
      )}
      <Image
        className={twMerge(
          "h-full w-full max-w-full object-contain transition-opacity duration-200",
          status === "loaded" ? "opacity-100" : "opacity-0",
        )}
        src={imgUrl}
        alt={alt ?? "Product image"}
        width={480}
        height={360}
        priority
        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
        onLoad={() => setStatus("loaded")}
        onError={() => setStatus("error")}
      />
    </figure>
  )
}
