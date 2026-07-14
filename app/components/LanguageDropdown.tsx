"use client"

import { useRef, useState } from "react"
import Image from "next/image"
import { usePathname, useSearchParams } from "next/navigation"
import { TbChevronDown, TbWorld } from "react-icons/tb"
import { twMerge } from "tailwind-merge"

import { TLocaleTag } from "@/ts/types/i18n/TLocaleTag"
import { useCurrentLocale } from "@/locales/client"
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

interface LanguageDropdownProps {
  className?: string
  isDropUp?: boolean
  locale?: TLocaleTag
}

function CurrentLocaleLanguageDropdown(props: Omit<LanguageDropdownProps, "locale">) {
  const locale = useCurrentLocale()
  return <LanguageDropdownContent {...props} locale={locale} />
}

function LanguageDropdownContent({ className, isDropUp = false, locale }: LanguageDropdownProps & { locale: TLocaleTag }) {
  const [showDropdown, setShowDropdown] = useState(false)
  const dropdownContainerRef = useRef<HTMLDivElement>(null)

  const pathname = usePathname() || "/"
  const searchParams = useSearchParams()
  const currentLocale = locales.find(localeOption => localeOption.code === locale)

  useOnEscOrClickOutside(dropdownContainerRef, () => setShowDropdown(false), { isHookEnabled: showDropdown })

  const getLocaleHref = (code: TLocaleTag) => {
    const localePrefix = new RegExp(`^/(${locales.map(localeOption => localeOption.code).join("|")})(?=/|$)`)
    const pathWithoutLocale = pathname.replace(localePrefix, "") || "/"
    const query = searchParams.toString()
    return `/${code}${pathWithoutLocale}${query ? `?${query}` : ""}`
  }

  return (
    <div className={twMerge("relative inline-flex w-[130px] flex-col", className)} ref={dropdownContainerRef}>
      {/* Trigger — w-full so it stretches to whatever width the container is */}
      <button
        data-cy="language-trigger"
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
        {locales.map(localeOption => (
          <a
            data-cy={`language-${localeOption.code}`}
            key={localeOption.code}
            href={getLocaleHref(localeOption.code)}
            className={`flex w-full items-center gap-2 whitespace-nowrap px-3 py-2 text-left text-sm transition-colors duration-100 ${
              locale === localeOption.code ? "bg-brand/15 text-brand hover:bg-brand/25" : "text-title hover:bg-foreground-accent"
            }`}
            onClick={() => setShowDropdown(false)}>
            <Image
              src={localeOption.flag}
              alt={localeOption.name}
              width={18}
              height={13}
              sizes="18px"
              className="rounded-sm object-cover"
            />
            {localeOption.name}
          </a>
        ))}
      </div>
    </div>
  )
}

export function LanguageDropdown({ locale, ...props }: LanguageDropdownProps) {
  return locale ? <LanguageDropdownContent {...props} locale={locale} /> : <CurrentLocaleLanguageDropdown {...props} />
}
