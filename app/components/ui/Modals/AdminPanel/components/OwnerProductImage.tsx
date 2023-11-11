import Image from "next/image"

interface OwnerProductImageProps {
  imgUrl: string
}

export function OwnerProductImage({ imgUrl }: OwnerProductImageProps) {
  return (
    <figure className="relative h-[300px] tablet:aspect-video tablet:h-[125px] tablet:w-fit laptop:h-[150px] object-coverw">
      <Image
        className="tablet:aspect-video  h-[300px] w-full tablet:h-[125px] tablet:w-fit laptop:h-[150px] object-cover"
        src={imgUrl}
        alt="image"
        width={177}
        height={100}
        priority
      />
    </figure>
  )
}
