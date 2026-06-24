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
  hasVariants: boolean
}

export function OwnerProductHeader({ id, translations, price, onStock, hasVariants }: OwnerProductHeaderProps) {
  return (
    <section className="flex min-w-0 flex-col gap-y-3">
      <div className="flex min-w-0 flex-col gap-2 tablet:flex-row tablet:items-center tablet:justify-between">
        <FormatTitleForm id={id} translations={translations} />
        <FormatPriceForm id={id} price={price} />
      </div>
      <FormatDescriptionForm id={id} translations={translations} />
      <FormatOnStockForm id={id} onStock={onStock} isDerivedFromVariants={hasVariants} />
    </section>
  )
}
