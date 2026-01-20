import { Slider } from "@/components/ui"
import Image from "next/image"

interface ProductImageProps {
  imgUrl: string[]
  productTitle: string
}

export function ProductImage({ imgUrl, productTitle }: ProductImageProps) {
  return (
    <>
      {imgUrl.length === 1 ? (
        <Image
          className="w-full laptop:aspect-video h-[500px] laptop:h-[200px] desktop:h-[250px] laptop:w-fit object-cover"
          src={imgUrl[0]}
          alt="image"
          width={720}
          height={480}
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          priority
        />
      ) : (
        <Slider
          className="w-full laptop:w-fit tablet:w-full tablet:h-[500px]"
          containerClassName="w-full laptop:w-fit tablet:w-full tablet:h-full"
          images={imgUrl.map((image, index) => ({
            src: image,
            alt: `${productTitle}-${index + 1}`,
          }))}
          width={720}
          height={480}
          swipeable={false}
        />
      )}
    </>
  )
}
