import Image from "next/image"
import { twMerge } from "tailwind-merge"

interface OwnerProductImageProps {
  imgUrl: string
  className?: string
}

export const OWNER_PRODUCT_MEDIA_WRAPPER_CLASSNAME =
  "mx-auto aspect-[4/3] w-full max-w-[480px] overflow-hidden rounded bg-black/[0.04] tablet:mx-0 tablet:max-w-none tablet:w-[233px] laptop:w-[267px] desktop:w-[333px]"

export function OwnerProductImage({ imgUrl, className }: OwnerProductImageProps) {
  return (
    <figure className={twMerge("relative h-full w-full overflow-hidden bg-black/[0.04]", className)}>
      <Image
        className="h-full w-full max-w-full object-contain"
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
