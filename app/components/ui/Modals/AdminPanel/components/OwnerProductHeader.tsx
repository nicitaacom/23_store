import { TProductTranslations } from "@/ts/product/TProductDB"
import { FormatCategoryForm } from "./FormatCategoryForm"
import { FormatDescriptionForm } from "./FormatDescriptionForm"
import { FormatOnStockForm } from "./FormatOnStockForm"
import { FormatPriceForm } from "./FormatPriceForm"
import { FormatTitleForm } from "./FormatTitleForm"

interface OwnerProductHeaderProps {
  id: string
  translations: TProductTranslations
  price: number
  onStock: number
  hasVariants: boolean
  category_id?: string | null
}

export function OwnerProductHeader({ id, translations, price, onStock, hasVariants, category_id }: OwnerProductHeaderProps) {
  return (
    <section className="flex min-w-0 flex-col gap-y-3">
      <div className="flex min-w-0 flex-col gap-2 tablet:flex-row tablet:items-center tablet:justify-between">
        <FormatTitleForm id={id} translations={translations} />
        <FormatPriceForm id={id} price={price} />
      </div>
      <FormatDescriptionForm id={id} translations={translations} />
      <FormatOnStockForm id={id} onStock={onStock} isDerivedFromVariants={hasVariants} />
      <FormatCategoryForm id={id} category_id={category_id} />
    </section>
  )
}
