import { memo } from "react"
import { twMerge } from "tailwind-merge"

import { TProductDB } from "@/TS/product/TProductDB"
import { formatCurrency } from "@/utils/currencyFormatter"
import { ProductQuantity } from "../ProductQuantity"
import { ProductButtons } from "../ProductButtons"
import { ProductImage } from "../ProductImage"
import { RequestReplanishmentButton } from "./RequestReplanishmentButton"

type Props = TProductDB & {
  containerClassName?: string
}

function Product({ ...product }: Props) {
  return (
    <article
      className={twMerge(
        "flex flex-col laptop:flex-row justify-between hover:bg-success/5 transition-colors group relative",
        "before:absolute before:left-0 before:top-0 before:h-full before:w-1 before:bg-success before:scale-y-0 before:transition-transform",
        "hover:before:scale-y-100",
        product.containerClassName,
      )}>
      <ProductImage imgUrl={product.img_url} productTitle={product.title} />
      <div className="flex flex-col justify-between gap-y-8 tablet:gap-y-0 w-full px-4 py-4">
        <section className="flex flex-col gap-y-4 tablet:gap-y-0 justify-between items-center tablet:items-start mb-4">
          <div className="flex flex-col mobile:flex-row gap-x-2 justify-between items-center w-full">
            <h1
              className={`w-full mobile:w-[60%] text-2xl text-title font-semibold text-center mobile:text-start tablet:text-2xl overflow-hidden ${
                product.on_stock === 0 ? "line-clamp-1" : "line-clamp-2"
              }`}>
              {product.title}
            </h1>
            <div className="flex items-center gap-x-2">
              <span className="text-sm text-subTitle">Price:</span>
              <h1 className="text-2xl text-success font-bold">{formatCurrency(product.price)}</h1>
            </div>
          </div>
          <div className="w-full laptop:w-[70%] flex flex-col gap-y-2">
            <h1
              className={`overflow-hidden ${product.on_stock === 0 ? "line-clamp-1" : "line-clamp-2"}
             text-lg tablet:text-sm text-subTitle text-center laptop:text-start`}>
              {product.sub_title}
            </h1>
            <div className="flex items-center gap-x-2">
              <div
                className={`w-2 h-2 rounded-full ${product.on_stock === 0 ? "bg-warning animate-pulse" : "bg-success"}`}
              />
              <p className={`text-sm ${product.on_stock === 0 ? "text-warning" : "text-success"}`}>
                {product.on_stock === 0 ? "Out of stock" : `${product.on_stock} units available`}
              </p>
            </div>
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
            <ProductButtons productId={product.id} />
          )}
        </section>
      </div>
    </article>
  )
}

export default memo(Product)
