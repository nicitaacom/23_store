"use client"

import { useState } from "react"
import Link from "next/link"
import { CiStar } from "react-icons/ci"
import { FaStar } from "react-icons/fa"

import { TProductDB } from "@/ts/product/TProductDB"
import { ProductLikeButton } from "../../components/ProductLikeButton"
import { formatCurrency } from "@/utils/currencyFormatter"
import { formatNumber } from "@/utils/numberFormatter"
import { getProductPrimaryImageUrl, toProductLocale } from "@/utils/product"
import supabaseClient from "@/libs/supabase/supabaseClient"
import usePurchasedProductsStore from "@/store/user/usePurchasedProductsStore"
import useRatedProductsStore from "@/store/user/useRatedProductsStore"
import { useScopedI18n } from "@/locales/client"
import { ImageWithFallback } from "@/components/ui"

interface PopularProductCardProps {
  product: TProductDB
  locale: string
}

// Reference "USDT / Claim" card adapted to a product: big title, feature rows, bottom action.
// Heart (like) shows for users who have NOT bought it; stars (rate) show for users who HAVE bought it.
export function PopularProductCard({ product, locale }: PopularProductCardProps) {
  const t = useScopedI18n("product")
  const translation = product.translations[toProductLocale(locale)] ?? product.translations.fi
  const imageUrl = getProductPrimaryImageUrl(product)

  const { purchasedProductIds } = usePurchasedProductsStore()
  const { ratingByProductId, setProductRating } = useRatedProductsStore()
  const isBought = purchasedProductIds.includes(product.id)
  const myRating = ratingByProductId[product.id] ?? 0

  const [hover, setHover] = useState(0)
  const ratingCount = product.rating_count ?? 0
  const averageRating = ratingCount > 0 ? (product.rating_sum ?? 0) / ratingCount : 0
  const likesCount = product.likes_count ?? 0

  function rateProduct(stars: number) {
    if (myRating) return // one rating per user
    setProductRating(product.id, stars)
    void supabaseClient.rpc("add_product_rating", { p_id: product.id, stars })
  }

  return (
    <article className="group flex flex-col overflow-hidden rounded-2xl border border-border-color/20 bg-modal-surface shadow-compact-lg transition-transform duration-300 hover:-translate-y-1">
      {/* Image banner + like (only when not bought) */}
      <div className="relative aspect-square w-full shrink-0 overflow-hidden bg-foreground/5">
        <ImageWithFallback
          className="object-cover transition-transform duration-500 group-hover:scale-105"
          src={imageUrl}
          alt={translation.title}
          fill
          fallbackClassName="object-contain"
          sizes="(max-width: 768px) 100vw, (max-width: 1440px) 33vw, 25vw"
        />
        {!isBought && <ProductLikeButton className="absolute right-3 top-3 z-[2]" productId={product.id} />}
      </div>

      <div className="flex flex-1 flex-col gap-3 p-5">
        <div>
          <h3 className="text-2xl font-bold leading-tight text-title line-clamp-2">{translation.title}</h3>
          <p className="mt-1 text-sm text-subTitle line-clamp-2">{translation.description}</p>
        </div>

        <div className="h-px w-full bg-border-color/20" />

        {/* Price + likes/avg-rating summary */}
        <div className="flex items-end justify-between gap-2">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-subTitle">{t("price")}</p>
            <p className="text-2xl font-bold text-success">{formatCurrency(product.price)}</p>
          </div>
          <div className="flex flex-col items-end gap-1 text-xs text-subTitle">
            <span className="inline-flex items-center gap-1">
              <FaStar className="text-warning" size={13} />
              {ratingCount > 0 ? `${averageRating.toFixed(1)} (${formatNumber(ratingCount)})` : t("no_ratings_yet")}
            </span>
            <span>
              {formatNumber(likesCount)} {t("likes")}
            </span>
          </div>
        </div>

        {/* Rate (only when bought) */}
        {isBought && (
          <div className="rounded-lg border border-border-color/20 bg-background/40 px-3 py-2">
            <p className="mb-1 text-[11px] font-medium uppercase tracking-[0.16em] text-subTitle">
              {myRating ? t("your_rating") : t("rate_this_product")}
            </p>
            <div className="flex gap-1">
              {Array.from({ length: 5 }, (_, index) => {
                const starValue = index + 1
                const isFilled = starValue <= (hover || myRating)
                return (
                  <button
                    className="rounded p-0.5 transition-transform duration-150 hover:scale-110 disabled:cursor-default disabled:hover:scale-100"
                    key={starValue}
                    type="button"
                    disabled={Boolean(myRating)}
                    onMouseEnter={() => !myRating && setHover(starValue)}
                    onMouseLeave={() => setHover(0)}
                    onClick={() => rateProduct(starValue)}>
                    {isFilled ? <FaStar className="text-warning" size={24} /> : <CiStar className="text-icon-color" size={24} />}
                  </button>
                )
              })}
            </div>
          </div>
        )}

        <Link
          className="mt-auto flex items-center justify-center rounded-xl bg-brand px-4 py-3 text-sm font-semibold text-title-foreground transition-colors duration-150 hover:bg-brand/90"
          href={`/${locale}/products/${product.id}`}>
          {t("view_product")}
        </Link>
      </div>
    </article>
  )
}
