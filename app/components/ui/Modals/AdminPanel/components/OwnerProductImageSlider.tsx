"use client"

import { useState } from "react"
import { AiFillCaretLeft, AiFillCaretRight } from "react-icons/ai"
import { twMerge } from "tailwind-merge"

import { OwnerProductImage } from "./OwnerProductImage"

interface OwnerProductImageSliderProps {
  images: string[]
  title: string
  onClickSlide?: (e: React.MouseEvent) => void
}

// http://localhost:6006/?path=/story/admin-adminpanelmodal--add-product
export function OwnerProductImageSlider({ images, title, onClickSlide }: OwnerProductImageSliderProps) {
  const [slideIndex, setSlideIndex] = useState(0)
  const hasMultiple = images.length > 1
  const safeIndex = Math.min(slideIndex, images.length - 1)

  const prev = (e: React.MouseEvent) => {
    e.stopPropagation()
    setSlideIndex(prevIndex => Math.max(0, prevIndex - 1))
  }

  const next = (e: React.MouseEvent) => {
    e.stopPropagation()
    setSlideIndex(prevIndex => Math.min(images.length - 1, prevIndex + 1))
  }

  return (
    <div
      className={twMerge(
        "mx-auto w-full max-w-[480px] overflow-hidden rounded bg-foreground/[0.06] tablet:mx-0 tablet:max-w-none tablet:w-[233px] laptop:w-[267px] desktop:w-[333px]",
        "relative max-w-none",
      )}
      onClick={onClickSlide}>
      <OwnerProductImage
        key={images[safeIndex]}
        imgUrl={images[safeIndex]}
        alt={hasMultiple ? `${title} ${safeIndex + 1}` : title}
      />
      {hasMultiple && (
        <>
          <button
            className="absolute left-0 top-0 z-10 flex h-full w-9 items-center justify-center bg-black/40 text-white opacity-0 transition-opacity group-hover:opacity-100 disabled:opacity-20"
            onClick={prev}
            disabled={safeIndex === 0}>
            <AiFillCaretLeft size={18} />
          </button>
          <button
            className="absolute right-0 top-0 z-10 flex h-full w-9 items-center justify-center bg-black/40 text-white opacity-0 transition-opacity group-hover:opacity-100 disabled:opacity-20"
            onClick={next}
            disabled={safeIndex === images.length - 1}>
            <AiFillCaretRight size={18} />
          </button>
          <span className="absolute bottom-1.5 right-2 z-10 rounded bg-black/50 px-1.5 py-0.5 text-[10px] font-medium text-white/80 tabular-nums">
            {safeIndex + 1}/{images.length}
          </span>
        </>
      )}
    </div>
  )
}
