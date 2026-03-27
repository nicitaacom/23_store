"use client"

import { memo, useMemo, useState } from "react"
import { twMerge } from "tailwind-merge"

import { TProductDB } from "@/ts/product/TProductDB"
import { formatCurrency } from "@/utils/currencyFormatter"
import { formatNumber } from "@/utils/numberFormatter"
import { ProductQuantity } from "../ProductQuantity"
import { ProductButtons } from "../ProductButtons"
import { ProductImage } from "../ProductImage"
import { RequestReplanishmentButton } from "./RequestReplanishmentButton"
import Image from "next/image"

type Props = TProductDB & {
  containerClassName?: string
}

function Product({ ...product }: Props) {
  const isOutOfStock = product.on_stock === 0
  const variants = useMemo(
    () => product.variants?.filter(variant => variant.label && variant.image_url) || [],
    [product.variants],
  )
  const [selectedVariantId, setSelectedVariantId] = useState(variants[0]?.id || "")
  const selectedVariant = variants.find(variant => variant.id === selectedVariantId) || variants[0]
  const previewImages = selectedVariant?.image_url ? [selectedVariant.image_url] : product.img_url

  return (
    <article
      className={twMerge(
        "flex flex-col mobile:flex-row justify-between rounded-xl border border-border-color/20",
        "bg-gradient-to-br from-success/3 to-transparent",
        "hover:from-success/8 hover:to-success/3 hover:border-success/30 hover:shadow-lg hover:shadow-success/10",
        "transition-all duration-300 group relative overflow-hidden",
        "before:absolute before:left-0 before:top-0 before:h-full before:w-1.5 before:bg-gradient-to-b before:from-success before:to-success-accent",
        "before:scale-y-0 before:transition-transform before:duration-300 hover:before:scale-y-100",
        product.containerClassName,
      )}>
      <div className="mobile:w-[200px] mobile:h-[200px] shrink-0">
        <ProductImage imgUrl={previewImages} productTitle={product.title} />
      </div>

      <div className="flex flex-col justify-between gap-y-4 w-full px-5 py-4 min-w-0">
        <section className="flex flex-col gap-y-3 justify-between items-center mobile:items-start">
          <div className="flex flex-col mobile:flex-row gap-x-2 gap-y-2 justify-between items-center mobile:items-start w-full">
            <h1 className="w-full mobile:w-[60%] text-xl mobile:text-2xl text-title font-semibold text-center mobile:text-start line-clamp-2 group-hover:text-success transition-colors duration-300 min-w-0">
              {product.title}
            </h1>

            <div className="flex items-center gap-x-3 px-3 py-1.5 rounded-lg bg-success/10 border border-success/20 shrink-0">
              <span className="text-sm text-subTitle font-medium whitespace-nowrap">Price:</span>
              <h1 className="text-xl mobile:text-2xl text-success font-bold tracking-tight whitespace-nowrap">
                {formatCurrency(product.price)}
              </h1>
            </div>
          </div>

          <div className="w-full flex flex-col gap-y-2 min-w-0">
            <h1 className="line-clamp-2 text-base mobile:text-sm text-subTitle text-center mobile:text-start leading-relaxed">
              {product.sub_title}
            </h1>

            <div className="flex items-center gap-x-3 px-3 py-1.5 rounded-lg bg-background/50 border border-border-color/20 w-fit">
              <div
                className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                  isOutOfStock ? "bg-warning animate-pulse shadow-lg shadow-warning/50" : "bg-success shadow-lg shadow-success/50"
                }`}
              />
              <p className={`text-sm font-medium whitespace-nowrap ${isOutOfStock ? "text-warning" : "text-success"}`}>
                {isOutOfStock ? "Out of stock" : `${formatNumber(product.on_stock)} units available`}
              </p>
            </div>

            {variants.length > 0 && (
              <div className="w-full rounded-xl border border-border-color/20 bg-background/35 p-3">
                <p className="text-sm font-medium text-title">
                  Variant: <span className="text-success">{selectedVariant?.label}</span>
                </p>

                <div className="mt-3 flex flex-wrap gap-2">
                  {variants.map(variant => {
                    const isActive = variant.id === selectedVariant?.id

                    return (
                      <button
                        key={variant.id}
                        type="button"
                        onClick={() => setSelectedVariantId(variant.id)}
                        className={twMerge(
                          "flex items-center gap-2 rounded-xl border px-2 py-2 text-left transition-all duration-200",
                          isActive
                            ? "border-success/40 bg-success/10 text-title shadow-[0_0_0_1px_rgba(34,197,94,0.18)]"
                            : "border-border-color/20 bg-background/40 text-subTitle hover:border-success/25 hover:bg-success/5",
                        )}>
                        <Image
                          className="h-11 w-11 rounded-lg object-cover"
                          width={512}
                          height={512}
                          src={variant.image_url}
                          alt={variant.label}
                        />
                        <span className="max-w-[130px] text-sm font-medium leading-5">{variant.label}</span>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        </section>

        <section
          className={`min-h-[50px] flex flex-col mobile:flex-row gap-y-3 gap-x-4 ${isOutOfStock ? "justify-end" : "justify-between"}`}>
          {!isOutOfStock && <ProductQuantity productId={product.id} productPrice={product.price} />}
          {isOutOfStock ? (
            <div className="flex flex-row justify-center mobile:justify-end items-end">
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
