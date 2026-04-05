"use client"

import { BiSearchAlt } from "react-icons/bi"
import { twMerge } from "tailwind-merge"

import { SearchInput } from "@/components/ui/Inputs/SearchInput"
import { useScopedI18n } from "@/locales/client"

interface AdminPanelProductSearchProps {
  query: string
  onQueryChange: (query: string) => void
  visibleCount: number
  totalCount: number
}

export function AdminPanelProductSearch({
  query,
  onQueryChange,
  visibleCount,
  totalCount,
}: AdminPanelProductSearchProps) {
  const t = useScopedI18n("product")

  return (
    <div className="rounded border border-border-color/35 bg-foreground/55 px-3 py-3 shadow-none">
      <div className="flex flex-col gap-2 tablet:flex-row tablet:items-center tablet:justify-between">
        <div className="min-w-0 flex-1">
          <p className="mb-1 text-xs font-semibold uppercase tracking-[0.14em] text-subTitle">{t("catalog_search_action")}</p>
          <SearchInput
            autoFocus={false}
            autoComplete="off"
            className="w-full"
            name="admin-panel-product-search"
            onChange={event => onQueryChange(event.currentTarget.value)}
            placeholder={t("catalog_search_placeholder")}
            startIcon={<BiSearchAlt className="text-icon-color" size={20} />}
            type="search"
            value={query}
          />
        </div>
        <div className="shrink-0 rounded border border-border-color/30 bg-background/70 px-2 py-1 text-xs text-subTitle shadow-none">
          <span className="font-semibold text-title">{visibleCount}</span>
          {" / "}
          <span>{totalCount}</span>
        </div>
      </div>
    </div>
  )
}
