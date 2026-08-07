"use client"

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
  "inline-flex h-11 min-w-[44px] items-center justify-center rounded border border-success/18 bg-[#111315] px-3 text-sm font-medium text-title transition-all duration-200 hover:border-success/40 hover:bg-success/8"

function PaginationControls({
  hasNextPage,
  hasPrevPage,
  currentPage,
  totalPages,
  perPage,
  basePath,
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

    return `${basePath}?${params.toString()}`
  }

  const paginationItems = buildPaginationItems(currentPage, totalPages)

  return (
    <div className="flex w-full flex-col items-center gap-2 tablet:w-auto tablet:items-start">
      <div className="flex flex-wrap items-center justify-center gap-2 rounded border border-success/18 bg-[#111315]/92 p-2 shadow-[0_10px_28px_rgba(0,0,0,0.22)]">
        <a
          className={twMerge(controlBaseClassName, !hasPrevPage && "pointer-events-none opacity-35")}
          aria-disabled={!hasPrevPage}
          href={hasPrevPage ? createPageHref(currentPage - 1) : undefined}>
          <BiChevronLeft className="text-lg text-success" />
        </a>

        <div className="flex flex-wrap items-center gap-2">
          {paginationItems.map((item, index) =>
            typeof item === "number" ? (
              <a
                className={twMerge(
                  controlBaseClassName,
                  item === currentPage
                    ? "border-success bg-success/14 text-success shadow-[inset_0_0_0_1px_rgba(34,197,94,0.35)]"
                    : "text-title/88",
                )}
                key={`${item}-${index}`}
                aria-current={item === currentPage ? "page" : undefined}
                href={createPageHref(item)}>
                {item}
              </a>
            ) : (
              <span
                className="inline-flex h-11 min-w-[44px] items-center justify-center rounded border border-white/8 bg-[#15181b] px-3 text-sm text-subTitle"
                key={`${item}-${index}`}>
                ...
              </span>
            ),
          )}
        </div>

        <a
          className={twMerge(controlBaseClassName, !hasNextPage && "pointer-events-none opacity-35")}
          aria-disabled={!hasNextPage}
          href={hasNextPage ? createPageHref(currentPage + 1) : undefined}>
          <BiChevronRight className="text-lg text-success" />
        </a>
      </div>

      <p className="px-1 text-xs uppercase tracking-[0.18em] text-subTitle">
        {t("page_of_total", { current: currentPage, total: totalPages })}
      </p>
    </div>
  )
}

export default PaginationControls
