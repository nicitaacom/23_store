"use client"

import { useState } from "react"
import { Slider } from "@/components/ui"
import { useI18n } from "@/locales/client"
import Image from "next/image"

interface ProductImageProps {
  imgUrl: string[]
  productTitle: string
}

export function ProductImage({ imgUrl, productTitle }: ProductImageProps) {
  const t = useI18n()
  const [isBroken, setIsBroken] = useState(false)
  const showFallback = isBroken || !imgUrl[0]

  return imgUrl.length === 1 ? (
    <div className={showFallback ? "relative w-full h-full flex flex-col items-center justify-center gap-2" : "relative w-full h-full"}>
      <Image
        className={showFallback ? "object-contain w-auto h-4/5" : "w-full h-full object-contain"}
        src={showFallback ? "/no-image-fallback.png" : imgUrl[0]}
        alt={productTitle}
        width={720}
        height={480}
        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
        priority
        onError={() => setIsBroken(true)}
      />
      {showFallback && (
        <p className="text-center text-xs text-white/40">{t("product.no_image_found")}</p>
      )}
    </div>
  ) : (
    <Slider
      className="object-contain"
      containerClassName="w-full h-full"
      images={imgUrl.map((image, index) => ({ src: image, alt: `${productTitle}-${index + 1}` }))}
      width={720}
      height={480}
      swipeable={false}
      noImageLabel={t("product.no_image_found")}
    />
  )
}
