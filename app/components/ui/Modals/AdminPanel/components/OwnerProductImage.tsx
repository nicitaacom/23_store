import Image from "next/image"

interface OwnerProductImageProps {
  imgUrl: string
}

export function OwnerProductImage({ imgUrl }: OwnerProductImageProps) {
  return (
    <figure className="relative tablet:aspect-video tablet:h-[100px] tablet:w-fit object-coverw">
      <Image
        className="tablet:aspect-video w-full tablet:h-[100px] tablet:w-fit object-cover"
        src={imgUrl}
        alt="image"
        width={177}
        height={100}
        priority
      />
    </figure>
  )
}
