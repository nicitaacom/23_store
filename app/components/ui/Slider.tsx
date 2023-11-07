"use client"

import Image from "next/image"
import { useState } from "react"

import { AiFillCaretRight, AiFillCaretLeft } from "react-icons/ai"
import { twMerge } from "tailwind-merge"

interface SliderProps {
  images: string[]
  title: string
  className?: string
  containerClassName?: string
}

export function Slider({ images, title, className = "", containerClassName = "" }: SliderProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isMoving, setIsMoving] = useState(false)
  const [direction, setDirection] = useState("")

  const goToPreviousSlide = () => {
    if (!isMoving) {
      setIsMoving(true)
      setDirection("left")
      setTimeout(() => {
        setCurrentIndex(prev => (prev === 0 ? images.length - 1 : prev - 1))
        setIsMoving(false)
      }, 300)
    }
  }

  const goToNextSlide = () => {
    if (!isMoving) {
      setIsMoving(true)
      setDirection("right")
      setTimeout(() => {
        setCurrentIndex(prev => (prev === images.length - 1 ? 0 : prev + 1))
        setIsMoving(false)
      }, 300)
    }
  }

  return (
    <figure className={twMerge(`relative w-full laptop:w-fit ${containerClassName}`)}>
      <div
        className={twMerge(
          `relative tablet:aspect-video h-[500px] tablet:h-[175px] laptop:h-[200px] desktop:h-[250px] tablet:w-fit overflow-hidden ${className}`,
        )}>
        {images.map((image: string, index: number) => (
          //TODO - add pripority for first two images
          <Image
            key={index}
            className={twMerge(`w-full tablet:aspect-video h-[500px] tablet:h-[175px] laptop:h-[200px] desktop:h-[250px] tablet:w-fit object-cover
             transition-all duration-300 ${currentIndex === index ? "" : "opacity-0 absolute"}
              ${isMoving ? `transform ${direction === "left" ? "-translate-x-full" : "translate-x-full"}` : ""}
              ${className}`)}
            src={image}
            alt={title}
            width={480}
            height={360}
            priority
          />
        ))}
      </div>
      <button
        className="absolute z-[88] top-0 bottom-0 left-0 w-[40px] bg-[rgba(0,0,0,0.4)] flex justify-center items-center"
        onClick={goToPreviousSlide}>
        <AiFillCaretLeft className="h-6 w-6 text-white" />
      </button>
      <button
        className="absolute z-[88] top-0 bottom-0 right-0 w-[40px] bg-[rgba(0,0,0,0.4)] flex justify-center items-center"
        onClick={goToNextSlide}>
        <AiFillCaretRight className="h-6 w-6 text-white" />
      </button>
    </figure>
  )
}
