import { IFormDataAddProduct } from "@/interfaces/product/IFormDataAddProduct"

import { FormatPriceForm } from "./FormatPriceForm"
import { FormatTitleForm } from "./FormatTitleForm"
import { FormatOnStockForm } from "./FormatOnStockForm"
import { FormatDescriptionForm } from "./FormatDescriptionForm"

export function OwnerProductHeader({ title, subTitle, price, onStock, id }: IFormDataAddProduct & { id: string }) {
  return (
    <section className="flex flex-col">
      <div className="flex flex-col tablet:flex-row gap-y-4 items-center tablet:items-start tablet:justify-between">
        <FormatTitleForm id={id} title={title} />
        <FormatPriceForm id={id} price={price} />
      </div>
      <FormatDescriptionForm id={id} subTitle={subTitle} />
      <FormatOnStockForm id={id} onStock={onStock} />
    </section>
  )
}
