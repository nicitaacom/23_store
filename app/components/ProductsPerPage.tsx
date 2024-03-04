"use client"
import { useEffect, useRef, useState } from "react"
import Link from "next/link"

import { BiUpArrow } from "react-icons/bi"
import { perPage } from "@/constant/perPage"
import { useSearchParams } from "next/navigation"
import { useRouter } from "next/navigation"

export default function ProductsPerPage({ className }: { className?: string }) {
  const [showDropdown, setShowDropdown] = useState(false)

  /* for close on clicking outside */
  const dropdownContainerRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (e.target instanceof Element) {
        if (!dropdownContainerRef.current?.contains(e.target)) {
          setShowDropdown(false)
        }
      }
    }

    document.addEventListener("mousedown", handler)

    return () => {
      document.removeEventListener("mousedown", handler)
    }
  }, [])

  /* for closing on esc */
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setShowDropdown(false)
      }
    }

    if (typeof document !== "undefined") {
      document.addEventListener("keydown", handleKeyDown)
    }

    return () => {
      if (typeof document !== "undefined") {
        document.removeEventListener("keydown", handleKeyDown)
      }
    }
  }, [])

  const [currentValuePerPage, setCurrentValuePerPage] = useState<number | null>(
    Number(useSearchParams()?.get("perPage") || 5),
  )

  const [hover, setHover] = useState<number | null>(null)
  const isHover = hover !== null

  function mouseHover(index: number) {
    return () => setHover(index)
  }

  const page = useSearchParams()?.getAll("page")

  return (
    <div
      className={`relative flex justify-between items-center gap-x-2 border-[1px] border-solid rounded-[4px]
    h-[48px] max-h-[42px] cursor-pointer px-4 py-2 ${className}`}
      onClick={() => setShowDropdown(!showDropdown)}
      ref={dropdownContainerRef}>
      {/* Container content */}
      <div className="flex flex-row gap-x-2 justify-between items-center">
        <div className="flex items-center">
          {currentValuePerPage} per page
          <h1 className="uppercase">{perPage.map(perPage => perPage === Number(currentValuePerPage))}</h1>
        </div>
        <BiUpArrow />
      </div>

      {/* Dropdown content */}
      <div
        className={`absolute top-[-600%] left-[-1px] right-[-1px]
      border-[1px] border-solid border-foreground z-10 bg-background
       flex flex-col text-md text-center ${
         showDropdown
           ? "opacity-100 visible translate-y-[5px] transition-all duration-300"
           : "opacity-0 invisible translate-y-[25px] transition-all duration-300"
       }`}
        onMouseLeave={() => setHover(null)}>
        {perPage.map(perPage => (
          <Link
            className={`border-b-[1px] border-solid border-foreground
        transition-all duration-[300ms]
                ${
                  isHover
                    ? hover === perPage && "bg-foreground"
                    : Number(currentValuePerPage) === perPage && "bg-brand text-title-foreground"
                }`}
            onMouseOver={mouseHover(perPage)}
            onClick={() => setCurrentValuePerPage(perPage)}
            href={`?page=${page}&perPage=${perPage}`}
            key={perPage}>
            {perPage}
          </Link>
        ))}
      </div>
    </div>
  )
}
