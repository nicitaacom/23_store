"use client"

import Link from "next/link"
import { BiChevronLeft, BiChevronRight } from "react-icons/bi"
import { twMerge } from "tailwind-merge"

import { useScopedI18n } from "@/locales/client"

type PaginationItem = number | "ellipsis-left" | "ellipsis-right"

interface PaginationControlsProps {
  hasNextPage: boolean
  hasPrevPage: boolean
  currentPage: number
  totalPages: number
  perPage: number
  basePath: string
  categoryId?: string | null
  query?: string
}

function buildPaginationItems(currentPage: number, totalPages: number): PaginationItem[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1)
  }

  const items: PaginationItem[] = [1]
  const windowStart = Math.max(2, currentPage - 1)
  const windowEnd = Math.min(totalPages - 1, currentPage + 1)

  if (windowStart > 2) {
    items.push("ellipsis-left")
  }

  for (let page = windowStart; page <= windowEnd; page += 1) {
    items.push(page)
  }

  if (windowEnd < totalPages - 1) {
    items.push("ellipsis-right")
  }

  items.push(totalPages)

  return items
}

const controlBaseClassName =
  "inline-flex h-[44px] min-w-[44px] items-center justify-center rounded border border-success/18 bg-[#111315] px-2 text-sm font-medium text-title transition-all duration-200 hover:border-success/40 hover:bg-success/8 tablet:px-3"

function PaginationControls({
  hasNextPage,
  hasPrevPage,
  currentPage,
  totalPages,
  perPage,
  basePath,
  categoryId,
  query,
}: PaginationControlsProps) {
  const t = useScopedI18n("common")

  const createPageHref = (pageNumber: number) => {
    const params = new URLSearchParams({
      page: String(pageNumber),
      perPage: String(perPage),
    })

    if (query?.trim()) {
      params.set("query", query.trim())
    }
    if (categoryId) params.set("category", categoryId)

    return `${basePath}?${params.toString()}`
  }

  const paginationItems = buildPaginationItems(currentPage, totalPages)
  return (
    <div className="flex min-w-0 flex-col items-center gap-2 tablet:items-start">
      <nav className="flex items-center justify-center gap-1.5 rounded border border-success/18 bg-[#111315]/92 p-1.5 shadow-[0_10px_28px_rgba(0,0,0,0.22)] tablet:gap-2 tablet:p-2" aria-label={t("pagination")}>
        <Link
          className={twMerge(controlBaseClassName, !hasPrevPage && "pointer-events-none opacity-35")}
          aria-disabled={!hasPrevPage}
          aria-label={t("previous_page")}
          href={createPageHref(hasPrevPage ? currentPage - 1 : currentPage)}
          onNavigate={event => {
            event.preventDefault()
            if (hasPrevPage) window.history.pushState(null, "", createPageHref(currentPage - 1))
          }}
          prefetch={false}
          scroll={false}
          tabIndex={hasPrevPage ? undefined : -1}>
          <BiChevronLeft className="text-lg text-success" />
        </Link>

        <span className="min-w-12 text-center text-xs font-semibold text-title tablet:hidden">
          {t("page_compact", { current: currentPage, total: totalPages })}
        </span>

        <div className="hidden items-center gap-2 tablet:flex">
          {paginationItems.map((item, index) =>
            typeof item === "number" ? (
              <Link
                className={twMerge(
                  controlBaseClassName,
                  item === currentPage
                    ? "border-success bg-success/14 text-success shadow-[inset_0_0_0_1px_rgba(34,197,94,0.35)]"
                    : "text-title/88",
                )}
                key={`${item}-${index}`}
                aria-current={item === currentPage ? "page" : undefined}
                href={createPageHref(item)}
                onNavigate={event => {
                  event.preventDefault()
                  if (item !== currentPage) window.history.pushState(null, "", createPageHref(item))
                }}
                prefetch={false}
                scroll={false}>
                {item}
              </Link>
            ) : (
              <span
                className="inline-flex h-11 min-w-[44px] items-center justify-center rounded border border-white/8 bg-[#15181b] px-3 text-sm text-subTitle"
                key={`${item}-${index}`}>
                ...
              </span>
            ),
          )}
        </div>

        <Link
          className={twMerge(controlBaseClassName, !hasNextPage && "pointer-events-none opacity-35")}
          aria-disabled={!hasNextPage}
          aria-label={t("next_page")}
          href={createPageHref(hasNextPage ? currentPage + 1 : currentPage)}
          onNavigate={event => {
            event.preventDefault()
            if (hasNextPage) window.history.pushState(null, "", createPageHref(currentPage + 1))
          }}
          prefetch={false}
          scroll={false}
          tabIndex={hasNextPage ? undefined : -1}>
          <BiChevronRight className="text-lg text-success" />
        </Link>
      </nav>

      <p className="hidden px-1 text-xs uppercase tracking-[0.18em] text-subTitle tablet:block">
        {t("page_of_total", { current: currentPage, total: totalPages })}
      </p>
    </div>
  )
}

export default PaginationControls
