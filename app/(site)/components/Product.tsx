import { memo } from "react"
import { twMerge } from "tailwind-merge"

import { TProductDB } from "@/interfaces/product/TProductDB"
import { formatCurrency } from "@/utils/currencyFormatter"
import { RequestReplanishmentButton } from "@/components/ui/Buttons"
import { ProductQuantity } from "./ProductQuantity"
import { ProductButtons } from "./ProductButtons"
import { ProductImage } from "./ProductImage"

type Props = TProductDB & {
  containerClassName?: string
}

function Product({ ...product }: Props) {
  return (
    <article
      className={twMerge(
        "flex flex-col laptop:flex-row justify-between border-t-[1px] border-b-[1px] border-solid border-border-color",
        product.containerClassName,
      )}>
      <ProductImage imgUrl={product.img_url} productTitle={product.title} />
      <div className="flex flex-col justify-between gap-y-8 tablet:gap-y-0 w-full px-2 py-2">
        <section className="flex flex-col gap-y-4 tablet:gap-y-0 justify-between items-center tablet:items-start text-brand mb-4">
          <div className="flex flex-col mobile:flex-row gap-x-2 justify-between items-center w-full">
            <h1
              className={`w-full mobile:w-[60%] text-2xl text-center mobile:text-start tablet:text-2xl overflow-hidden ${
                product.on_stock === 0 ? "line-clamp-1" : "line-clamp-2"
              }`}>
              {product.title}
            </h1>
            <h1 className="w-full mobile:w-[35%] text-2xl text-center mobile:text-end tablet:text-xl">
              {formatCurrency(product.price)}
            </h1>
          </div>
          <div className="w-full laptop:w-[70%] flex flex-col">
            <h1
              className={`overflow-hidden ${product.on_stock === 0 ? "line-clamp-1" : "line-clamp-2"}
             text-lg tablet:text-sm text-subTitle text-center laptop:text-start`}>
              {product.sub_title}
            </h1>
            <p
              className={`text-lg tablet:text-sm text-subTitle text-center laptop:text-start
            ${product.on_stock === 0 && "text-warning"}`}>
              {product.on_stock === 0 ? "Out of stock" : `Left on stock:${product.on_stock}`}
            </p>
          </div>
        </section>

        <section
          className={`min-h-[50px] flex flex-col laptop:flex-row gap-y-4 gap-x-4 ${product.on_stock === 0 ? "justify-end" : "justify-between"}`}>
          <ProductQuantity productId={product.id} productPrice={product.price} />
          {product.on_stock === 0 ? (
            <div className="flex flex-row justify-center tablet:justify-end items-end">
              <RequestReplanishmentButton product={product} />
            </div>
          ) : (
            <ProductButtons productId={product.id} productOnStock={product.on_stock} />
          )}
        </section>
      </div>
    </article>
  )
}

export default memo(Product)
