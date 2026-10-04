"use client"
import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { usePathname, useSearchParams } from "next/navigation"
import { BiUpArrow } from "react-icons/bi"

import { defaultPerPage, perPage } from "@/constant/perPage"
import { useScopedI18n } from "@/locales/client"

// http://localhost:6006/?path=/story/commerce-catalog--search-form
export default function ProductsPerPage({ className }: { className?: string }) {
  const t = useScopedI18n("product")
  const [showDropdown, setShowDropdown] = useState(false)
  const searchParams = useSearchParams()
  const pathname = usePathname()
  const selectedPerPage = Number(searchParams?.get("perPage") || defaultPerPage)
  const selectedQuery = searchParams?.get("query")?.trim() || ""

  /* for close on clicking outside */
  const dropdownContainerRef = useRef<HTMLDivElement>(null)

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

  const [hover, setHover] = useState<number | null>(null)
  const isHover = hover !== null

  function mouseHover(index: number) {
    return () => setHover(index)
  }

  const createHref = (nextPerPage: number) => {
    const params = new URLSearchParams({
      page: "1",
      perPage: String(nextPerPage),
    })

    if (selectedQuery) {
      params.set("query", selectedQuery)
    }

    return `${pathname}?${params.toString()}`
  }

  return (
    <div className={`relative shrink-0 ${className ?? ""}`} ref={dropdownContainerRef}>
      {/* Container content */}
      <button
        className="flex h-10 items-center justify-between gap-x-2 rounded-[4px] border border-solid px-2 py-2 text-sm tablet:px-4 tablet:text-base"
        type="button"
        aria-label={`${selectedPerPage} ${t("per_page")}`}
        aria-expanded={showDropdown}
        onClick={() => setShowDropdown(!showDropdown)}>
        <div className="flex flex-row items-center justify-between gap-x-2">
          <div className="flex items-center">
            {selectedPerPage} <span className="hidden tablet:inline">{t("per_page")}</span>
          </div>
          <BiUpArrow />
        </div>
      </button>

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
                    : selectedPerPage === perPage && "bg-brand text-title-foreground"
                }`}
            onMouseOver={mouseHover(perPage)}
            onClick={() => {
              setShowDropdown(false)
            }}
            href={createHref(perPage)}
            key={perPage}>
            {perPage}
          </Link>
        ))}
      </div>
    </div>
  )
}
