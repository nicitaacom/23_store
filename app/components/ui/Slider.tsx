"use client"

import "react-responsive-carousel/lib/styles/carousel.min.css"
import { twMerge } from "tailwind-merge"
import { Carousel } from "react-responsive-carousel"
import { AiFillCaretRight, AiFillCaretLeft } from "react-icons/ai"

import { TImages } from "@/ts/types/TImages"
import { ImageWithFallback } from "./ImageWithFallback"

interface SliderProps {
  images: TImages
  width: number
  height: number
  emulateTouch?: boolean
  swipeable?: boolean
  containerClassName?: string
  className?: string
}

function SliderImage({
  image,
  width,
  height,
  className,
}: {
  image: TImages[number]
  width: number
  height: number
  className?: string
}) {
  return (
    <ImageWithFallback
      className={twMerge("object-contain w-full h-full", className)}
      fallbackWrapperClassName="relative w-full h-full flex flex-col items-center justify-center gap-2"
      fallbackClassName="w-auto h-4/5"
      showLabel
      src={image.src}
      alt={image.alt}
      width={width}
      height={height}
      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
      loading="lazy"
    />
  )
}

export function Slider({ images, width, height, emulateTouch, swipeable, className, containerClassName }: SliderProps) {
  return (
    <figure
      className={twMerge(
        "relative w-full h-full bg-black [&_.carousel]:h-full [&_.carousel-root]:h-full [&_.slider-wrapper]:h-full [&_.slider]:h-full",
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
        dynamicHeight={false}
        renderArrowPrev={(clickHandler, hasPrev) => (
          <button
            className={twMerge(
              // 1. anchor to figure via absolute, center vertically
              "absolute z-[88] top-1/2 -translate-y-1/2 left-0 h-full w-[40px] bg-[rgba(0,0,0,0.4)] flex justify-center items-center cursor-pointer duration-500",
              !hasPrev && "opacity-50 cursor-default",
            )}
            aria-label="Previous image"
            onClick={clickHandler}
            disabled={!hasPrev}>
            <AiFillCaretLeft className="h-6 w-6 text-white" />
          </button>
        )}
        renderArrowNext={(clickHandler, hasNext) => (
          <button
            className={twMerge(
              "absolute z-[88] top-1/2 -translate-y-1/2 right-0 h-full w-[40px] bg-[rgba(0,0,0,0.4)] flex justify-center items-center cursor-pointer duration-500",
              !hasNext && "opacity-50 cursor-default",
            )}
            aria-label="Next image"
            onClick={clickHandler}
            disabled={!hasNext}>
            <AiFillCaretRight className="h-6 w-6 text-white" />
          </button>
        )}>
        {images.map((image, index) => (
          <SliderImage className={className} key={index} image={image} width={width} height={height} />
        ))}
      </Carousel>
    </figure>
  )
}
