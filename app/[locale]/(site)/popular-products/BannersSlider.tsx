"use client"

import { useEffect, useState } from "react"
import Image from "next/image"

import { useScopedI18n } from "@/locales/client"

const BANNERS = [
  {
    src: "/banners/banner-1.gif",
    alt: "Banner 1",
    heading: "Up to 70% sale",
    sub: "Run to get your discount until it's too late",
  },
  {
    src: "/banners/banner-2.gif",
    alt: "Banner 2",
    heading: "Up to 70% sale",
    sub: "Run to get your discount until it's too late",
  },
  {
    src: "/banners/banner-3.png",
    alt: "Banner 3",
    heading: "Big discounts on tech & Apple products",
    sub: "Exclusive deals on the gear you love — grab yours before stock runs out",
  },
]

// http://localhost:6006/?path=/story/commerce-catalog--search-form
export function BannersSlider() {
  const t = useScopedI18n("popular")
  const [current, setCurrent] = useState(0)
  const [animating, setAnimating] = useState(false)

  useEffect(() => {
    const timer = setInterval(() => {
      setAnimating(true)
      setTimeout(() => {
        setCurrent((prevCurrent) => (prevCurrent + 1) % BANNERS.length)
        setAnimating(false)
      }, 1000)
    }, 8000)
    return () => clearInterval(timer)
  }, [])

  const banner = BANNERS[current]

  return (
    <div className="relative h-full min-h-0 w-full overflow-hidden rounded-lg tablet:min-h-[320px] tablet:rounded-[16px] tablet:border tablet:border-white/10">
      <div
        style={{ transition: "opacity 1000ms ease" }}
        className={`relative h-full w-full ${animating ? "opacity-0" : "opacity-100"}`}>
        <Image className="object-cover" src={banner.src} alt={banner.alt} fill unoptimized />
        <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/50 to-transparent" />
        <div className="absolute bottom-2 left-2 min-w-0 max-w-[54%] tablet:bottom-6 tablet:left-6 tablet:max-w-[55%]">
          <p className="break-words text-xs font-bold leading-tight text-white tablet:text-xl laptop:text-2xl">{banner.heading}</p>
          <p className="mt-0.5 break-words text-[10px] leading-tight text-white/75 tablet:mt-1.5 tablet:text-sm tablet:leading-relaxed">
            {banner.sub}
          </p>
        </div>
      </div>

      <div style={{ zIndex: 10 }} className="absolute bottom-0 right-0 flex gap-0 tablet:bottom-4 tablet:right-5 tablet:gap-2">
        {BANNERS.map((_, index) => (
          <button
            className="flex h-11 w-11 items-center justify-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            key={index}
            type="button"
            aria-label={t("banner_slide", { index: index + 1 })}
            aria-pressed={current === index}
            data-cy="popular-banner-selector"
            data-banner-index={index + 1}
            onClick={() => setCurrent(index)}>
            <span
              className={`h-1.5 rounded-full transition-all duration-300 ${index === current ? "w-6 bg-white" : "w-1.5 bg-white/60"}`}
            />
          </button>
        ))}
      </div>
    </div>
  )
}
