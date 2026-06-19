"use client"

import { ImageWithFallback, Slider } from "@/components/ui"

interface ProductImageProps {
  imgUrl: string[]
  productTitle: string
}

export function ProductImage({ imgUrl, productTitle }: ProductImageProps) {
  return imgUrl.length === 1 ? (
    <ImageWithFallback
      className="w-full h-full object-contain"
      fallbackWrapperClassName="relative w-full h-full flex flex-col items-center justify-center gap-2"
      fallbackClassName="object-contain w-auto h-4/5"
      showLabel
      src={imgUrl[0]}
      alt={productTitle}
      width={720}
      height={480}
      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
      priority
    />
  ) : (
    <Slider
      className="object-contain"
      containerClassName="w-full h-full"
      images={imgUrl.map((image, index) => ({ src: image, alt: `${productTitle}-${index + 1}` }))}
      width={720}
      height={480}
      swipeable={false}
    />
  )
}
