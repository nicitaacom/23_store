import { ProductTranslations } from "@/ts/product/TProductDB"

import { FormatPriceForm } from "./FormatPriceForm"
import { FormatTitleForm } from "./FormatTitleForm"
import { FormatOnStockForm } from "./FormatOnStockForm"
import { FormatDescriptionForm } from "./FormatDescriptionForm"
import { FormatImagesForm } from "./FormatImagesForm"

interface OwnerProductHeaderProps {
  id: string
  translations: ProductTranslations
  price: number
  onStock: number
  imgUrl: string[]
}

export function OwnerProductHeader({ id, translations, price, onStock, imgUrl }: OwnerProductHeaderProps) {
  return (
    <section className="flex flex-col gap-y-3">
      <div className="flex flex-col gap-3 tablet:flex-row tablet:items-start tablet:justify-between">
        <FormatTitleForm id={id} translations={translations} />
        <FormatPriceForm id={id} price={price} />
      </div>
      <FormatDescriptionForm id={id} translations={translations} />
      <FormatOnStockForm id={id} onStock={onStock} />
      <FormatImagesForm id={id} imgUrl={imgUrl} />
    </section>
  )
}
