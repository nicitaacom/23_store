"use client"

import { BiTrash } from "react-icons/bi"

import { formatCurrency } from "@/utils/currencyFormatter"
import { Button } from "@/components/ui"
import { useAreYouSureDeleteProductModal } from "@/store/ui/areYouSureDeleteProductModal"
import { useScopedI18n } from "@/locales/client"

interface DeleteProductHeaderProps {
  id: string
  title: string
  description: string
  price: number
}

export function DeleteProductHeader({ id, title, description, price }: DeleteProductHeaderProps) {
  const t = useScopedI18n("product")
  const areYouSureDeleteProductModal = useAreYouSureDeleteProductModal()

  return (
    <>
      <section className="flex flex-col gap-y-3">
        <div className="flex flex-col gap-3 tablet:flex-row tablet:items-start tablet:justify-between">
          <div className="flex flex-col gap-y-1">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-subTitle">{t("title")}</p>
            <h2 className="text-base font-semibold text-title">{title}</h2>
          </div>
          <div className="flex flex-col gap-y-1 tablet:items-end">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-subTitle">{t("price")}</p>
            <h2 className="text-sm font-semibold text-title">{formatCurrency(price)}</h2>
          </div>
        </div>
        <div className="flex flex-col gap-y-1">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-subTitle">{t("description")}</p>
          <h2 className="text-sm leading-6 text-subTitle">{description}</h2>
        </div>
      </section>
      <section className="mt-4 flex justify-end border-t border-border-color/50 pt-4">
        <Button size="sm" variant="danger" onClick={() => areYouSureDeleteProductModal.openModal(id, title)}>
          {t("delete")}
          <BiTrash />
        </Button>
      </section>
    </>
  )
}
