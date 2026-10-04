"use client"

import type { MouseEvent } from "react"
import { BiSearchAlt } from "react-icons/bi"

import { useCurrentLocale, useScopedI18n } from "@/locales/client"

// http://localhost:6006/?path=/story/navigation-navbar--mobile-search-focus
export function MobileSearchButton() {
  const locale = useCurrentLocale()
  const t = useScopedI18n("product")

  function handleSearchClick(event: MouseEvent<HTMLAnchorElement>) {
    const searchInput = document.getElementById("catalog-search-input")
    if (!(searchInput instanceof HTMLInputElement)) return
    event.preventDefault()
    searchInput.focus()
    searchInput.scrollIntoView({ behavior: "smooth", block: "center" })
  }

  return (
    <a
      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md text-title transition-colors hover:bg-foreground/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand tablet:hidden"
      aria-label={t("catalog_search_action")}
      data-cy="mobile-search"
      href={`/${locale}?focusSearch=1`}
      onClick={handleSearchClick}>
      <BiSearchAlt size={28} />
    </a>
  )
}
