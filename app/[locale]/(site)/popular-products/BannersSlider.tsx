"use client"

import { useEffect, useState } from "react"
import Image from "next/image"

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
    <div className="relative h-full min-h-[320px] w-full overflow-hidden rounded-[16px] border border-white/10">
      <div
        style={{ transition: "opacity 1000ms ease" }}
        className={`relative h-full w-full ${animating ? "opacity-0" : "opacity-100"}`}>
        <Image className="object-cover" src={banner.src} alt={banner.alt} fill unoptimized />
        <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/50 to-transparent" />
        <div className="absolute bottom-6 left-6 max-w-[55%]">
          <p className="text-xl font-bold leading-tight text-white laptop:text-2xl">{banner.heading}</p>
          <p className="mt-1.5 text-sm leading-relaxed text-white/75">{banner.sub}</p>
        </div>
      </div>

      <div style={{ zIndex: 10 }} className="absolute bottom-4 right-5 flex gap-2">
        {BANNERS.map((_, index) => (
          <button
            className={`h-1.5 rounded-full transition-all duration-300 ${index === current ? "w-6 bg-white" : "w-1.5 bg-white/40"}`}
            key={index}
            onClick={() => setCurrent(index)}
          />
        ))}
      </div>
    </div>
  )
}
