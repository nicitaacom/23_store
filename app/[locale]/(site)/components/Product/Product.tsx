"use client"

import { memo, useEffect, useMemo, useState } from "react"
import { twMerge } from "tailwind-merge"

import { useCurrentLocale, useScopedI18n } from "@/locales/client"
import { TProductDB } from "@/ts/product/TProductDB"
import { formatCurrency } from "@/utils/currencyFormatter"
import { formatNumber } from "@/utils/numberFormatter"
import { getProductGalleryImages } from "@/utils/product"
import { getAvailableStock, getProductPriceForVariant } from "@/utils/cartProducts"
import { ProductQuantity } from "../ProductQuantity"
import { ProductButtons } from "../ProductButtons"
import { ProductImage } from "../ProductImage"
import { ProductLikeButton } from "../ProductLikeButton"
import { RequestReplanishmentButton } from "./RequestReplanishmentButton"
import Image from "next/image"
import Link from "next/link"
import { MarkdownText } from "@/components/ui/MarkdownText"

function VariantImage({ src, alt }: { src: string; alt: string }) {
  const [errored, setErrored] = useState(false)
  if (errored) return (
    <Image className="h-10 w-10 rounded object-cover" width={40} height={40} src="/no-image-fallback.png" alt={alt} sizes="40px" />
  )
  return (
    <Image className="h-10 w-10 rounded object-cover" width={512} height={512} src={src} alt={alt} sizes="40px" onError={() => setErrored(true)} />
  )
}

type Props = TProductDB & {
  cartKey?: string
  containerClassName?: string
  showViewButton?: boolean
  variantId?: string | null
}

function Product({ ...product }: Props) {
  const locale = useCurrentLocale()
  const t = useScopedI18n("product")
  const translation = product.translations[locale] ?? product.translations.fi
  const variants = useMemo(
    () => product.variants?.filter(variant => variant.label && variant.image_url) || [],
    [product.variants],
  )
  const [selectedVariantId, setSelectedVariantId] = useState(product.variantId || variants[0]?.id || "")
  const selectedVariant = variants.find(variant => variant.id === selectedVariantId) || variants[0]
  const previewImages = useMemo(() => getProductGalleryImages(product), [product.img_url])
  const selectedPrice = getProductPriceForVariant(product, selectedVariant?.id)
  const isVariantSelectionLocked = Boolean(product.cartKey)
  // Effective stock for the line in view: the chosen variant's quantity, or product on_stock when variantless.
  // 0 = sold out, so a single sold-out variant disables only that variant — not the whole product.
  const availableStock = getAvailableStock(product, selectedVariant?.id)
  const isOutOfStock = availableStock === 0

  useEffect(() => {
    setSelectedVariantId(product.variantId || variants[0]?.id || "")
  }, [product.variantId, variants])

  return (
    // 1. Card — soft accent gradient + animated left accent bar that grows on hover
    <article
      className={twMerge(
        "group relative flex flex-col overflow-hidden rounded-md border border-border-color/20 bg-gradient-to-br from-foreground/5 to-transparent transition-colors duration-300 tablet:flex-row",
        "hover:border-success/30 hover:from-success/10 hover:to-transparent",
        "before:absolute before:left-0 before:top-0 before:h-full before:w-1 before:origin-top before:scale-y-0 before:bg-gradient-to-b before:from-success before:to-success-accent before:transition-transform before:duration-300 hover:before:scale-y-100",
        product.containerClassName,
      )}>

      {/* 2. Media — full-width banner on mobile, fixed landscape that fills row height on tablet+ */}
      <div className="relative aspect-video w-full shrink-0 overflow-hidden bg-foreground/10 tablet:aspect-auto tablet:w-[240px]">
        <ProductImage imgUrl={previewImages} productTitle={translation.title} />
        <ProductLikeButton className="absolute right-2 top-2 z-[90]" productId={product.id} categoryId={product.category_id} />
      </div>

      {/* 3. Content */}
      <div className="flex min-w-0 flex-1 flex-col gap-3 p-3 tablet:p-4">

        {/* 4. Title + colored price pill */}
        <div className="flex flex-col gap-2 tablet:flex-row tablet:items-start tablet:justify-between">
          <Link href={`/${locale}/products/${product.id}`} className="line-clamp-2 min-w-0 text-lg font-semibold leading-snug text-title transition-colors duration-300 hover:text-success mobile:text-xl">
            {translation.title}
          </Link>
          <span className="inline-flex shrink-0 items-center gap-1.5 self-start rounded border border-success/20 bg-success/10 px-2.5 py-1">
            <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-subTitle">Price</span>
            <span className="text-lg font-bold tracking-tight text-success whitespace-nowrap mobile:text-xl">
              {formatCurrency(selectedPrice)}
            </span>
          </span>
        </div>

        {/* 5. Description */}
        <p className="line-clamp-2 overflow-hidden text-sm leading-relaxed text-subTitle [&_span]:contents">
          <MarkdownText text={translation.description ?? ""} />
        </p>

        {/* 6. Stock + locked-variant badges */}
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={twMerge(
              "inline-flex items-center gap-1.5 rounded border px-2 py-0.5 text-[11px] font-medium uppercase tracking-[0.16em]",
              isOutOfStock ? "border-warning/30 bg-warning/10 text-warning" : "border-success/25 bg-success/10 text-success",
            )}>
            <span className={twMerge("h-1.5 w-1.5 rounded-full shrink-0", isOutOfStock ? "bg-warning" : "bg-success")} />
            {isOutOfStock ? "Out of stock" : `${formatNumber(availableStock)} units`}
          </span>

          {/* Locked variant chip (in cart context) */}
          {variants.length > 0 && isVariantSelectionLocked && (
            <span className="inline-flex items-center gap-1.5 rounded border border-border-color/20 bg-background/55 px-2 py-0.5 text-[11px] text-subTitle">
              <VariantImage src={selectedVariant?.image_url || "/no-image-fallback.png"} alt={selectedVariant?.label || ""} />
              {selectedVariant?.label}
            </span>
          )}
        </div>

        {/* 7. Selectable variants (not in cart context) */}
        {variants.length > 0 && !isVariantSelectionLocked && (
          <div className="flex flex-row gap-2 overflow-x-auto pb-1">
            {variants.map(variant => {
              const isActive = variant.id === selectedVariant?.id
              const isVariantSoldOut = variant.quantity === 0
              return (
                <button
                  key={variant.id}
                  type="button"
                  onClick={() => setSelectedVariantId(variant.id)}
                  className={twMerge(
                    "flex shrink-0 items-center gap-2 rounded-md border px-2 py-1.5 text-left transition-colors duration-200",
                    isActive
                      ? "border-success/40 bg-success/10 text-title"
                      : "border-border-color/20 bg-background/40 text-subTitle hover:border-success/25 hover:bg-success/5",
                    isVariantSoldOut && "opacity-55",
                  )}>
                  <VariantImage src={variant.image_url} alt={variant.label} />
                  <div className="min-w-0">
                    <span className="block max-w-[120px] truncate text-sm font-medium leading-4">{variant.label}</span>
                    {isVariantSoldOut ? (
                      <span className="text-xs font-medium text-warning">{t("out_of_stock_label")}</span>
                    ) : (
                      <span className="text-xs text-success">{formatCurrency(variant.price)}</span>
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        )}

        {/* 8. Quantity + actions — pinned to the bottom of the card */}
        <section className="mt-auto flex flex-wrap items-center justify-between gap-3 pt-1">
          {!isOutOfStock && (
            <ProductQuantity productId={product.id} productPrice={selectedPrice} variantId={selectedVariant?.id} />
          )}
          {isOutOfStock ? (
            <div className="flex w-full justify-end">
              <RequestReplanishmentButton product={product} />
            </div>
          ) : (
            <ProductButtons
              ownerId={product.owner_id}
              productId={product.id}
              showViewButton={product.showViewButton}
              variantId={selectedVariant?.id}
              categoryId={product.category_id}
            />
          )}
        </section>

      </div>
    </article>
  )
}

export default memo(Product)
