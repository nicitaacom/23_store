"use client"

import Image from "next/image"
import { Carousel } from "react-responsive-carousel"
import "react-responsive-carousel/lib/styles/carousel.min.css"

import { AiFillCaretRight, AiFillCaretLeft } from "react-icons/ai"
import { twMerge } from "tailwind-merge"

export type TImages = {
  src: string
  alt: string
}[]

interface SliderProps {
  images: TImages
  width: number
  height: number
  emulateTouch?: boolean
  swipeable?: boolean
  containerClassName?: string
  className?: string
}

export function Slider({ images, width, height, emulateTouch, swipeable, className, containerClassName }: SliderProps) {
  return (
    <figure
      className={twMerge(
        "relative w-full tablet:aspect-video h-[500px] tablet:h-[175px] laptop:h-[200px] desktop:h-[250px] tablet:w-fit object-cover",
        containerClassName,
      )}>
      <Carousel
        showArrows={true}
        showIndicators={false}
        showStatus={false}
        showThumbs={false}
        axis="horizontal"
        emulateTouch={emulateTouch}
        swipeable={swipeable}
        dynamicHeight={true}
        renderArrowPrev={(clickHandler, hasPrev, label) => (
          <button
            className={twMerge(
              `absolute z-[88] top-0 bottom-0 left-0 w-[40px] bg-[rgba(0,0,0,0.4)]
               flex justify-center items-center cursor-pointer duration-500`,
              !hasPrev && "opacity-50 cursor-default",
            )}
            onClick={clickHandler}
            disabled={!hasPrev}>
            <AiFillCaretLeft className="h-6 w-6 text-white" />
          </button>
        )}
        renderArrowNext={(clickHandler, hasNext, label) => (
          <button
            className={twMerge(
              `absolute z-[88] top-0 bottom-0 right-0 w-[40px] bg-[rgba(0,0,0,0.4)]
               flex justify-center items-center cursor-pointer duration-500`,
              !hasNext && "opacity-50 cursor-default",
            )}
            onClick={clickHandler}
            disabled={!hasNext}>
            <AiFillCaretRight className="h-6 w-6 text-white" />
          </button>
        )}>
        {images.map((image, index) => (
          <Image
            className={twMerge(
              `max-w-full tablet:aspect-video h-[500px] tablet:h-[175px] laptop:h-[200px] desktop:h-[250px] object-cover`,
              className,
            )}
            src={image.src}
            alt={image.alt}
            width={width}
            height={height}
            key={index}
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            loading="lazy"
          />
        ))}
      </Carousel>
    </figure>
  )
}
