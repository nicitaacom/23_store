"use client"

import { useRef, useState } from "react"
import Image from "next/image"
import { TbChevronDown, TbWorld } from "react-icons/tb"
import { twMerge } from "tailwind-merge"

import { TLocaleTag } from "@/ts/types/i18n/TLocaleTag"
import { useChangeLocale, useCurrentLocale } from "@/locales/client"
import useOnEscOrClickOutside from "@/hooks/useOnEscOrClickOutside"

type Locale = {
  code: TLocaleTag
  name: string
  flag: string
}

const locales: Locale[] = [
  { code: "en", name: "English", flag: "/languages/EN.jpg" },
  { code: "fi", name: "Suomi", flag: "/languages/FI.svg" },
  { code: "ru", name: "Русский", flag: "/languages/RU.png" },
  { code: "se", name: "Svenska", flag: "/languages/SE.png" },
]

export function LanguageDropdown({ className, isDropUp = false }: { className?: string; isDropUp?: boolean }) {
  const [showDropdown, setShowDropdown] = useState(false)
  const dropdownContainerRef = useRef<HTMLDivElement>(null)

  const locale = useCurrentLocale()
  const changeLocale = useChangeLocale({ preserveSearchParams: true })
  const currentLocale = locales.find(l => l.code === locale)

  useOnEscOrClickOutside(dropdownContainerRef, () => setShowDropdown(false), { isHookEnabled: showDropdown })

  const handleLocaleChange = (code: TLocaleTag) => {
    changeLocale(code)
    setShowDropdown(false)
  }

  return (
    <div className={twMerge("relative inline-flex w-[130px] flex-col", className)} ref={dropdownContainerRef}>
      {/* Trigger — w-full so it stretches to whatever width the container is */}
      <button
        className="flex w-full items-center gap-1.5 rounded border border-border-color/35 bg-background/55 px-2.5 py-1.5
        text-sm text-title transition-colors duration-150 hover:bg-foreground/10"
        onClick={() => setShowDropdown(!showDropdown)}
        aria-expanded={showDropdown}>
        {currentLocale ? (
          <Image
            src={currentLocale.flag}
            alt={currentLocale.name}
            width={18}
            height={13}
            sizes="18px"
            className="rounded-sm object-cover"
          />
        ) : (
          <TbWorld size={14} className="text-icon-color" />
        )}
        <span className="text-xs font-medium uppercase tracking-wide">{currentLocale?.code}</span>
        <TbChevronDown
          size={12}
          className={`ml-auto text-icon-color transition-transform duration-150 ${showDropdown ? "rotate-180" : ""}`}
        />
      </button>

      {/* Panel opens below the trigger by default, or above it (dropUp) — e.g. when pinned to the bottom of the mobile aside */}
      <div
        className={twMerge(
          "absolute right-0 z-50 w-[130px] overflow-hidden rounded border border-border-color/35 bg-background shadow-compact transition-all duration-150",
          isDropUp ? "bottom-full mb-1" : "top-full mt-1",
          showDropdown ? "visible translate-y-0 opacity-100" : "invisible -translate-y-1 opacity-0",
        )}>
          {locales.map(l => (
            <button
              key={l.code}
              className={`flex w-full items-center gap-2 whitespace-nowrap px-3 py-2 text-left text-sm transition-colors duration-100 ${
                locale === l.code ? "bg-brand/15 text-brand" : "text-title hover:bg-foreground/10"
              }`}
              onClick={() => handleLocaleChange(l.code)}>
              <Image src={l.flag} alt={l.name} width={18} height={13} sizes="18px" className="rounded-sm object-cover" />
              {l.name}
            </button>
          ))}
      </div>
    </div>
  )
}
