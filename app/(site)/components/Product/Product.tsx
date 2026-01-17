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
  const isOutOfStock = product.on_stock === 0

  return (
    <article
      className={twMerge(
        "flex flex-col laptop:flex-row justify-between rounded-xl border border-border-color/20",
        "bg-gradient-to-br from-success/3 to-transparent",
        "hover:from-success/8 hover:to-success/3 hover:border-success/30 hover:shadow-lg hover:shadow-success/10",
        "transition-all duration-300 group relative overflow-hidden",
        "before:absolute before:left-0 before:top-0 before:h-full before:w-1.5 before:bg-gradient-to-b before:from-success before:to-success-accent",
        "before:scale-y-0 before:transition-transform before:duration-300 hover:before:scale-y-100",
        product.containerClassName,
      )}>
      <ProductImage imgUrl={product.img_url} productTitle={product.title} />

      <div className="flex flex-col justify-between gap-y-8 tablet:gap-y-0 w-full px-6 py-5">
        <section className="flex flex-col gap-y-4 tablet:gap-y-0 justify-between items-center tablet:items-start">
          <div className="flex flex-col mobile:flex-row gap-x-2 gap-y-3 justify-between items-center w-full">
            <h1
              className={`w-full mobile:w-[60%] text-2xl text-title font-semibold text-center mobile:text-start tablet:text-2xl overflow-hidden ${
                isOutOfStock ? "line-clamp-1" : "line-clamp-2"
              } group-hover:text-success transition-colors duration-300`}>
              {product.title}
            </h1>

            <div className="flex items-center gap-x-3 px-4 py-2 rounded-lg bg-success/10 border border-success/20">
              <span className="text-sm text-subTitle font-medium">Price:</span>
              <h1 className="text-2xl text-success font-bold tracking-tight">{formatCurrency(product.price)}</h1>
            </div>
          </div>

          <div className="w-full laptop:w-[70%] flex flex-col gap-y-3">
            <h1
              className={`overflow-hidden ${isOutOfStock ? "line-clamp-1" : "line-clamp-2"}
              text-lg tablet:text-sm text-subTitle text-center laptop:text-start leading-relaxed`}>
              {product.sub_title}
            </h1>

            <div className="flex items-center gap-x-3 px-3 py-2 rounded-lg bg-background/50 border border-border-color/20 w-fit">
              <div
                className={`w-2.5 h-2.5 rounded-full ${
                  isOutOfStock
                    ? "bg-warning animate-pulse shadow-lg shadow-warning/50"
                    : "bg-success shadow-lg shadow-success/50"
                }`}
              />
              <p className={`text-sm font-medium ${isOutOfStock ? "text-warning" : "text-success"}`}>
                {isOutOfStock ? "Out of stock" : `${product.on_stock} units available`}
              </p>
            </div>
          </div>
        </section>

        <section
          className={`min-h-[50px] flex flex-col laptop:flex-row gap-y-4 gap-x-4 ${
            isOutOfStock ? "justify-end" : "justify-between"
          }`}>
          <ProductQuantity productId={product.id} productPrice={product.price} />
          {isOutOfStock ? (
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
