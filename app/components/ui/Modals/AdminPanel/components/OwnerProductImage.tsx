import Image from "next/image"

interface OwnerProductImageProps {
  imgUrl: string
}

export function OwnerProductImage({ imgUrl }: OwnerProductImageProps) {
  return (
    <figure className="relative w-full overflow-hidden tablet:aspect-video h-[500px] tablet:h-[175px] laptop:h-[200px] desktop:h-[250px] tablet:w-fit">
      <Image
        className="h-[500px] w-full max-w-full object-contain tablet:h-[175px] laptop:h-[200px] desktop:h-[250px]"
        src={imgUrl}
        alt="image"
        width={480}
        height={360}
        priority
        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
      />
    </figure>
  )
}
