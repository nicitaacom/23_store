import Link from "next/link"

import { TProductDB } from "@/ts/product/TProductDB"
import { ImageWithFallback } from "@/components/ui"
import { formatCurrency } from "@/utils/currencyFormatter"
import { formatNumber } from "@/utils/numberFormatter"
import { getProductPrimaryImageUrl, toProductLocale } from "@/utils/product"

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
  const productLocale = toProductLocale(locale)

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

      <div
        className={`grid grid-cols-2 gap-3 tablet:grid-cols-3 laptop:grid-cols-4 ${compact ? "desktop:grid-cols-4" : "desktop:grid-cols-5"}`}>
        {products.map(product => {
          const translation = product.translations[productLocale] ?? product.translations.fi
          const imageUrl = getProductPrimaryImageUrl(product)
          const isInStock = (product.on_stock || 0) > 0
          const isHotProduct = hotProductIds.includes(product.id)

          return (
            <article
              key={product.id}
              className="group flex flex-col overflow-hidden rounded-lg border border-border-color/20 bg-background/80 shadow-lg shadow-success/5 transition-transform duration-300 hover:-translate-y-1 hover:border-success/30">
              {/* Vertical card — image banner on top, details below (grid tile) */}
              <div className="relative aspect-square w-full shrink-0 overflow-hidden bg-foreground/5">
                <ImageWithFallback
                  src={imageUrl}
                  alt={translation.title}
                  fill
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                  fallbackClassName="object-contain"
                  sizes="(max-width: 768px) 50vw, (max-width: 1440px) 25vw, 20vw"
                />
                {isHotProduct && (
                  <span className="absolute left-2 top-2 inline-flex items-center rounded border border-success/20 bg-background/85 px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.16em] text-success backdrop-blur-sm">
                    Hot
                  </span>
                )}
              </div>

              <div className="flex flex-1 flex-col gap-1.5 px-3 py-2.5">
                <span className={`inline-flex w-fit items-center rounded border px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.16em] ${isInStock ? "border-success/20 bg-success/10 text-success" : "border-warning/20 bg-warning/10 text-warning"}`}>
                  {isInStock ? `${formatNumber(product.on_stock)} in stock` : "Restocking"}
                </span>

                <h3 className="text-sm font-semibold leading-snug text-title line-clamp-2">{translation.title}</h3>
                <p className="text-xs leading-5 text-subTitle line-clamp-2">{translation.description}</p>

                <div className="mt-auto flex items-center justify-between gap-2 pt-1">
                  <p className="text-base font-bold text-success">{formatCurrency(product.price)}</p>

                  {showPreviewLink && (
                    <Link
                      href={`/${locale}/popular-products`}
                      className="rounded border border-success/30 bg-success/10 px-3 py-1 text-xs font-semibold text-success transition-colors duration-150 hover:border-success hover:bg-success hover:text-black">
                      Preview list
                    </Link>
                  )}
                </div>
              </div>
            </article>
          )
        })}
      </div>
    </section>
  )
}
