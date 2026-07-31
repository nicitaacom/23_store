"use client"

import { TAdminProductSort, ADMIN_PRODUCT_SORTS } from "@/ts/types/TAdminProductSort"
import { useScopedI18n } from "@/locales/client"

interface AdminPanelProductSortProps {
  value: TAdminProductSort
  onChange: (sort: TAdminProductSort) => void
}

// http://localhost:6006/?path=/story/admin-adminpanelmodal--edit-product
export function AdminPanelProductSort({ value, onChange }: AdminPanelProductSortProps) {
  const t = useScopedI18n("product")

  return (
    <select
      className="h-8 shrink-0 cursor-pointer rounded border border-white/15 bg-background/80 px-2 text-xs text-title outline-none transition-colors hover:border-white/25 focus:border-success-accent/35"
      aria-label={t("admin_sort_label")}
      value={value}
      onChange={event => onChange(event.currentTarget.value as TAdminProductSort)}>
      <option value={ADMIN_PRODUCT_SORTS.createdDesc}>{t("admin_sort_created_desc")}</option>
      <option value={ADMIN_PRODUCT_SORTS.createdAsc}>{t("admin_sort_created_asc")}</option>
      <option value={ADMIN_PRODUCT_SORTS.priceAsc}>{t("admin_sort_price_asc")}</option>
      <option value={ADMIN_PRODUCT_SORTS.priceDesc}>{t("admin_sort_price_desc")}</option>
      <option value={ADMIN_PRODUCT_SORTS.nameAsc}>{t("admin_sort_name_asc")}</option>
      <option value={ADMIN_PRODUCT_SORTS.nameDesc}>{t("admin_sort_name_desc")}</option>
    </select>
  )
}
