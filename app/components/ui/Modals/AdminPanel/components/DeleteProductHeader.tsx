"use client"

import { BiTrash } from "react-icons/bi"
import { twMerge } from "tailwind-merge"

import { formatCurrency } from "@/utils/currencyFormatter"
import { useScopedI18n } from "@/locales/client"
import { Button } from "@/components/ui"

interface DeleteProductHeaderProps {
  id: string
  title: string
  description: string
  price: number
  onRequestDelete: (id: string, title: string) => void
  isBulkMode?: boolean
  isSelected?: boolean
  onToggleSelect?: (id: string) => void
}

export function DeleteProductHeader({ id, title, description, price, onRequestDelete, isBulkMode, isSelected, onToggleSelect }: DeleteProductHeaderProps) {
  const t = useScopedI18n("product")

  return (
    <>
      <section className="flex flex-col gap-3">
        <div className="flex flex-col gap-2 tablet:flex-row tablet:items-start tablet:justify-between">
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-subTitle/70">{t("title")}</p>
            <h2 className="mt-0.5 text-base font-semibold leading-6 text-title">{title}</h2>
          </div>
          <div className="shrink-0 flex items-center gap-2 rounded border border-border-color/25 bg-background/50 px-3 py-2 shadow-none">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-subTitle/70">{t("price")}:</p>
            <p className="text-sm font-semibold text-title">{formatCurrency(price)}</p>
          </div>
        </div>
        <div className="rounded border border-border-color/25 bg-background/50 p-3 shadow-none">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-subTitle/70">{t("description")}</p>
          <p className="mt-0.5 line-clamp-3 text-sm leading-5 text-subTitle">{description}</p>
        </div>
      </section>

      <section className="mt-3 flex flex-col gap-2 border-t border-border-color/25 pt-3 tablet:flex-row tablet:items-center tablet:justify-between">
        {isBulkMode ? (
          <label
            className="flex cursor-pointer select-none items-center gap-2.5"
            onClick={e => e.stopPropagation()}>
            <input
              type="checkbox"
              checked={isSelected}
              onChange={() => onToggleSelect?.(id)}
              className="h-4 w-4 cursor-pointer accent-danger"
            />
            <span className="text-sm leading-6 text-subTitle">
              {isSelected ? "Selected for deletion" : t("confirm_delete_product")}
            </span>
          </label>
        ) : (
          <>
            <p className="text-sm leading-6 text-subTitle">{t("confirm_delete_product")}</p>
            <Button
              className="w-full tablet:w-auto"
              size="sm"
              variant="danger-outline"
              onClick={() => onRequestDelete(id, title)}>
              {t("delete")}
              <BiTrash />
            </Button>
          </>
        )}
      </section>
    </>
  )
}
