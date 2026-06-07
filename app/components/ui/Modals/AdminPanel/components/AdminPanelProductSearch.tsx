"use client"

import { BiSearchAlt } from "react-icons/bi"
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
    <div className="flex items-center gap-2">
      <div className="flex-1">
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
      <span className="shrink-0 text-xs font-medium tabular-nums text-subTitle/70">
        {visibleCount}
        <span className="mx-0.5 text-border-color/40">/</span>
        {totalCount}
      </span>
    </div>
  )
}
