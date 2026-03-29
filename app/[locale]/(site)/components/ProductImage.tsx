import { Slider } from "@/components/ui"
import Image from "next/image"

interface ProductImageProps {
  imgUrl: string[]
  productTitle: string
}

export function ProductImage({ imgUrl, productTitle }: ProductImageProps) {
  return imgUrl.length === 1 ? (
    <Image
      className="w-full h-full object-contain"
      src={imgUrl[0]}
      alt="image"
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
