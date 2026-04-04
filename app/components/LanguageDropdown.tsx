"use client"

import { useRef, useState } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { BiUpArrow } from "react-icons/bi"
import { TbWorld } from "react-icons/tb"

import { TLocaleTag } from "@/ts/types/i18n/TLocaleTag"
import { useCurrentLocale } from "@/locales/client"
import useOnEscOrClickOutside from "@/hooks/useOnEscOrClickOutside"

type Locale = {
  code: TLocaleTag
  name: string
  flag: string
}

const locales: Locale[] = [
  { code: "en", name: "English", flag: "🇺🇸" },
  { code: "fi", name: "Finnish", flag: "🇫🇮" },
  { code: "ru", name: "Russian", flag: "🇷🇺" },
  { code: "se", name: "Swedish", flag: "🇸🇪" },
]

const LOCALE_COOKIE_NAME = "Next-Locale"

function stripLocalePrefix(pathname: string, locales: TLocaleTag[]) {
  const matchedLocale = locales.find(locale => pathname === `/${locale}` || pathname.startsWith(`/${locale}/`))

  if (!matchedLocale) return pathname || "/"

  const pathWithoutLocale = pathname.slice(matchedLocale.length + 1)

  return pathWithoutLocale || "/"
}

export function LanguageDropdown({ className }: { className?: string }) {
  const [showDropdown, setShowDropdown] = useState(false)
  const dropdownContainerRef = useRef<HTMLDivElement>(null)

  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const locale = useCurrentLocale()
  const currentLocale = locales.find(l => l.code === locale)

  // 1. close dropdown on ESC or outside click
  useOnEscOrClickOutside(dropdownContainerRef, () => setShowDropdown(false), { isHookEnabled: showDropdown })

  const handleLocaleChange = (code: TLocaleTag) => {
    if (code === locale) {
      setShowDropdown(false)
      return
    }

    document.cookie = `${LOCALE_COOKIE_NAME}=${code}; path=/; samesite=strict`

    const nextPathname = stripLocalePrefix(pathname || "/", locales.map(locale => locale.code))
    const nextSearch = searchParams?.toString() || ""
    const nextUrl = `${nextPathname}${nextSearch ? `?${nextSearch}` : ""}`

    router.replace(nextUrl)
    router.refresh()
    setShowDropdown(false)
  }

  return (
    <div
      className={`relative flex justify-between items-center gap-x-2 border-[1px] border-solid
      rounded-[4px] h-[48px] max-h-[42px] cursor-pointer px-4 py-2 ${className}`}
      onClick={() => setShowDropdown(!showDropdown)}
      ref={dropdownContainerRef}>
      {/* Container content */}
      <div className="flex flex-row gap-x-2 justify-between items-center">
        <div className="flex items-center">
          <TbWorld size={24} />
          <h1 className="uppercase">{currentLocale?.code}</h1>
        </div>
        <BiUpArrow className="rotate-180" />
      </div>

      {/* Dropdown content */}
      <div
        className={`dropdown absolute top-[100%] left-[-1px] right-[-1px] border-[1px] border-solid border-foreground z-10 bg-background flex flex-col text-md text-center ${
          showDropdown
            ? "opacity-100 visible translate-y-[0px] transition-all duration-300"
            : "opacity-0 invisible translate-y-[-20px] transition-all duration-300"
        }`}>
        {locales.map((l, idx) => (
          <button
            key={l.code}
            className={`border-solid border-foreground transition-all duration-[300ms] hover:bg-foreground ${
              locale === l.code ? "bg-brand text-title-foreground" : ""
            } ${idx !== locales.length - 1 ? "border-b-[1px]" : ""}`}
            onClick={() => handleLocaleChange(l.code)}>
            {l.name}
          </button>
        ))}
      </div>
    </div>
  )
}
