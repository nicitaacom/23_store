import { IFormDataAddProduct } from "@/ts/product/IFormDataAddProduct"

import { FormatPriceForm } from "./FormatPriceForm"
import { FormatTitleForm } from "./FormatTitleForm"
import { FormatOnStockForm } from "./FormatOnStockForm"
import { FormatDescriptionForm } from "./FormatDescriptionForm"

export function OwnerProductHeader({ title, subTitle, price, onStock, id }: IFormDataAddProduct & { id: string }) {
  return (
    <section className="flex flex-col gap-y-3">
      <div className="flex flex-col gap-3 tablet:flex-row tablet:items-start tablet:justify-between">
        <FormatTitleForm id={id} title={title} />
        <FormatPriceForm id={id} price={price} />
      </div>
      <FormatDescriptionForm id={id} subTitle={subTitle} />
      <FormatOnStockForm id={id} onStock={onStock} />
    </section>
  )
}
