import Image from "next/image"
import Link from "next/link"

import { TProductDB } from "@/ts/product/TProductDB"
import { formatCurrency } from "@/utils/currencyFormatter"
import { formatNumber } from "@/utils/numberFormatter"

interface PopularProductsPreviewListProps {
  products: TProductDB[]
  locale: string
  title?: string
  subtitle?: string
  showHeader?: boolean
  compact?: boolean
  hotProductIds?: string[]
  showPreviewLink?: boolean
}

export function PopularProductsPreviewList({
  products,
  locale,
  title = "Popular products",
  subtitle = "A curated preview of the products customers notice first.",
  showHeader = true,
  compact = false,
  hotProductIds = [],
  showPreviewLink = true,
}: PopularProductsPreviewListProps) {
  return (
    <section className="w-full flex flex-col gap-[2px]">
      {showHeader && (
          <div className="flex flex-col gap-2">
            <div className="inline-flex w-fit items-center rounded-[4px] border border-success/20 bg-success/10 px-3 py-1 text-sm font-medium text-success">
              Popular products
            </div>
          <h2 className="text-3xl font-semibold text-title">{title}</h2>
          <p className="max-w-2xl text-base text-subTitle">{subtitle}</p>
        </div>
      )}

      <div className={`grid grid-cols-1 gap-[2px] ${compact ? "2xl:grid-cols-2" : "laptop:grid-cols-2"}`}>
        {products.map(product => {
          const imageUrl = product.img_url?.[0] || "/placeholder.jpg"
          const isInStock = (product.on_stock || 0) > 0
          const isHotProduct = hotProductIds.includes(product.id)

          return (
            <article
              key={product.id}
              className="group overflow-hidden rounded-[4px] border border-border-color/20 bg-background/80 shadow-lg shadow-success/5 transition-transform duration-300 hover:-translate-y-1 hover:border-success/30">
              <div className={`flex h-full flex-col ${compact ? "mobile:flex-row" : "mobile:flex-row"}`}>
                <div className={`relative w-full overflow-hidden ${compact ? "h-44 mobile:h-auto mobile:w-40" : "h-56 mobile:h-auto mobile:w-56"}`}>
                  <Image
                    src={imageUrl}
                    alt={product.title}
                    fill
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                    sizes={compact ? "(max-width: 768px) 100vw, 160px" : "(max-width: 768px) 100vw, 224px"}
                  />
                </div>

                <div className={`flex flex-1 flex-col ${compact ? "gap-[2px] px-1 py-0.5" : "gap-[2px] px-1 py-0.5"}`}>
                  <div className="flex flex-wrap items-center gap-2">
                    {isHotProduct && (
                      <span className="rounded-[4px] bg-success/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-success">
                        Hot now
                      </span>
                    )}
                    <span
                      className={`rounded-[4px] px-3 py-1 text-xs font-medium ${
                        isInStock ? "bg-success/10 text-success" : "bg-warning/10 text-warning"
                      }`}>
                      {isInStock ? `${formatNumber(product.on_stock)} in stock` : "Restocking"}
                    </span>
                  </div>

                  <div className="flex flex-col gap-2">
                    <h3 className={`${compact ? "text-xl" : "text-2xl"} font-semibold text-title`}>{product.title}</h3>
                    <p className={`text-sm leading-6 text-subTitle ${compact ? "line-clamp-2" : "line-clamp-3"}`}>{product.sub_title}</p>
                  </div>

                  <div className="mt-auto flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs uppercase tracking-[0.24em] text-subTitle">Preview price</p>
                      <p className={`${compact ? "text-xl" : "text-2xl"} font-bold text-success`}>{formatCurrency(product.price)}</p>
                    </div>

                    {showPreviewLink && (
                      <Link
                        href={`/${locale}/popular-products`}
                        className="rounded-[4px] border border-success/30 bg-success/10 px-4 py-2 text-sm font-semibold text-success transition-colors duration-300 hover:border-success hover:bg-success hover:text-black">
                        Preview list
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            </article>
          )
        })}
      </div>
    </section>
  )
}
