"use client"

import { BiTrash } from "react-icons/bi"
import { twMerge } from "tailwind-merge"

import { formatCurrency } from "@/utils/currencyFormatter"
import { Button } from "@/components/ui"
import { useScopedI18n } from "@/locales/client"

interface DeleteProductHeaderProps {
  id: string
  title: string
  description: string
  price: number
  onRequestDelete: (id: string, title: string) => void
}

export function DeleteProductHeader({ id, title, description, price, onRequestDelete }: DeleteProductHeaderProps) {
  const t = useScopedI18n("product")

  return (
    <>
      <section className="flex flex-col gap-4">
        <div className="flex flex-col gap-3 tablet:flex-row tablet:items-start tablet:justify-between">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-subTitle">{t("title")}</p>
            <h2 className="mt-1 text-base font-semibold leading-6 text-title">{title}</h2>
          </div>
          <div className={twMerge("shrink-0 rounded border border-border-color/30 bg-background/70 px-3 py-2 shadow-none tablet:min-w-[112px] tablet:text-end")}>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-subTitle">{t("price")}</p>
            <h2 className="mt-1 text-sm font-semibold text-title">{formatCurrency(price)}</h2>
          </div>
        </div>
        <div className="rounded border border-border-color/30 bg-background/70 p-3 shadow-none">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-subTitle">{t("description")}</p>
          <h2 className="mt-1 line-clamp-4 text-sm leading-6 text-subTitle">{description}</h2>
        </div>
      </section>
      <section className="mt-3 flex flex-col gap-2 border-t border-border-color/35 pt-3 tablet:flex-row tablet:items-center tablet:justify-between">
        <p className="text-sm leading-6 text-subTitle">{t("confirm_delete_product")}</p>
        <Button
          className="w-full tablet:w-auto"
          size="sm"
          variant="danger-outline"
          onClick={() => onRequestDelete(id, title)}>
          {t("delete")}
          <BiTrash />
        </Button>
      </section>
    </>
  )
}
