"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { BiUpArrow } from "react-icons/bi"
import { TbWorld } from "react-icons/tb"

import { languages } from "@/constant/languages"

export function Language({ className }: { className?: string }) {
  const [showDropdown, setShowDropdown] = useState(false)

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

  const [currentLanguage, setCurrentLanguage] = useState(2) //Cookies in feature
  const [hover, setHover] = useState<number | null>(null)
  const isHover = hover !== null

  function mouseHover(index: number) {
    return () => setHover(index)
  }

  function changeLanguage(index: number) {
    return () => setCurrentLanguage(index)
  }

  return (
    <div
      className={`relative flex justify-between items-center gap-x-2 border-[1px] border-solid rounded-[4px]
    h-[48px] max-h-[42px] cursor-pointer px-4 py-2 ${className}`}
      onClick={() => setShowDropdown(!showDropdown)}
      ref={dropdownContainerRef}>
      {/* Container content */}
      <div className="flex flex-row gap-x-2 justify-between items-center">
        <div className="flex items-center">
          <TbWorld size={24} />
          <h1 className="uppercase">{languages.map(language => currentLanguage === language.id && language.code)}</h1>
        </div>
        <BiUpArrow className="rotate-180" />
      </div>

      {/* Dropdown content */}
      <div
        className={`dropdown absolute top-[100%] left-[-1px] right-[-1px]
      border-[1px] border-solid border-foreground z-10 bg-background
       flex flex-col text-md text-center ${
         showDropdown
           ? "opacity-100 visible translate-y-[0px] transition-all duration-300"
           : "opacity-0 invisible translate-y-[-20px] transition-all duration-300"
       }`}
        onMouseLeave={() => setHover(null)}>
        {languages.map(language =>
          language.id !== 5 ? (
            <Link
              className={`border-b-[1px] border-solid border-foreground
        transition-all duration-[300ms]
                ${
                  isHover
                    ? hover === language.id && "bg-foreground"
                    : currentLanguage === language.id && "bg-brand text-title-foreground"
                }`}
              onMouseOver={mouseHover(language.id)}
              onClick={changeLanguage(language.id)}
              href={language.url}
              key={language.id}>
              {language.label}
            </Link>
          ) : (
            <Link
              className={`border-solid border-foreground
        transition-all duration-[300ms]
         ${
           isHover
             ? hover === language.id && "bg-foreground"
             : currentLanguage === language.id && "bg-brand text-title-foreground"
         }`}
              onMouseOver={mouseHover(language.id)}
              onClick={changeLanguage(language.id)}
              href={language.url}
              key={language.id}>
              {language.label}
            </Link>
          ),
        )}
      </div>
    </div>
  )
}
