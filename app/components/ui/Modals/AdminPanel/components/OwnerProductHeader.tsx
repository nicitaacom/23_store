import { ProductTranslations } from "@/ts/product/TProductDB"

import { FormatPriceForm } from "./FormatPriceForm"
import { FormatTitleForm } from "./FormatTitleForm"
import { FormatOnStockForm } from "./FormatOnStockForm"
import { FormatDescriptionForm } from "./FormatDescriptionForm"

interface OwnerProductHeaderProps {
  id: string
  translations: ProductTranslations
  price: number
  onStock: number
}

export function OwnerProductHeader({ id, translations, price, onStock }: OwnerProductHeaderProps) {
  return (
    <section className="flex flex-col gap-y-3">
      <div className="flex flex-col gap-3 tablet:flex-row tablet:items-start tablet:justify-between">
        <FormatTitleForm id={id} translations={translations} />
        <FormatPriceForm id={id} price={price} />
      </div>
      <FormatDescriptionForm id={id} translations={translations} />
      <FormatOnStockForm id={id} onStock={onStock} />
    </section>
  )
}
