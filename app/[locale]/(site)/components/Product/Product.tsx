"use client"

import { memo, useMemo, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { twMerge } from "tailwind-merge"

import { TProductDB } from "@/ts/product/TProductDB"
import { ProductButtons } from "../ProductButtons"
import { ProductImage } from "../ProductImage"
import { ProductLikeButton } from "../ProductLikeButton"
import { ProductQuantity } from "../ProductQuantity"
import { formatCurrency } from "@/utils/currencyFormatter"
import { formatNumber } from "@/utils/numberFormatter"
import { getAvailableStock, getProductPriceForVariant, getVariantImageUrl } from "@/utils/cartProducts"
import { getProductGalleryImages } from "@/utils/product"
import { getProductVariantSelectionLabel } from "@/utils/variantOptions"
import { resolvePersonalizationConfig } from "@/utils/printMetrics"
import { useCurrentLocale, useScopedI18n } from "@/locales/client"
import { PersonalizeButton } from "@/components/ui/Buttons/PersonalizeButton"
import { RequestReplanishmentButton } from "@/components/Product/RequestReplanishmentButton"
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
  // A label is all a variant needs to be real - size variants (S/M/L) look identical in a photo, so
  // they have no image of their own and show as a text chip instead of a swatch.
  const variants = useMemo(() => product.variants?.filter(variant => variant.label) || [], [product.variants])
  const derivedVariantId = product.variantId || variants.find(variant => variant.quantity > 0)?.id || variants[0]?.id || ""
  const [selectedVariantId, setSelectedVariantId] = useState(derivedVariantId)
  const [prevDerivedVariantId, setPrevDerivedVariantId] = useState(derivedVariantId)
  const selectedVariant = variants.find(variant => variant.id === selectedVariantId) || variants[0]
  // eslint-disable-next-line react-hooks/exhaustive-deps -- getProductGalleryImages only reads product.img_url
  const previewImages = useMemo(() => getProductGalleryImages(product), [product.img_url])
  const selectedVariantImage = selectedVariant?.image_url
  const displayedImages = selectedVariantImage
    ? [selectedVariantImage, ...previewImages.filter(image => image !== selectedVariantImage)]
    : previewImages
  const selectedPrice = getProductPriceForVariant(product, selectedVariant?.id)
  const isVariantSelectionLocked = Boolean(product.cartKey)
  // Effective stock for the line in view: the chosen variant's quantity, or product on_stock when variantless.
  // 0 = sold out, so a single sold-out variant disables only that variant — not the whole product.
  const availableStock = getAvailableStock(product, selectedVariant?.id)
  const isOutOfStock = availableStock === 0
  const personalizationConfig = resolvePersonalizationConfig(product, selectedVariant?.id)

  if (derivedVariantId !== prevDerivedVariantId) {
    setPrevDerivedVariantId(derivedVariantId)
    setSelectedVariantId(derivedVariantId)
  }

  return (
    // 1. Card — soft accent gradient + animated left accent bar that grows on hover
    <article
      className={twMerge(
        "halloween-product-card group relative flex flex-col overflow-hidden rounded-md laptop:flex-row border border-border-color/20 bg-gradient-to-br from-foreground/5 to-transparent transition-colors duration-300",
        "hover:border-success/30 hover:from-success/10 hover:to-transparent",
        // before:z-10 - the media div below is positioned too, so without it the accent bar paints
        // under the product image and the hover effect is only visible next to the text
        "before:absolute before:left-0 before:top-0 before:z-10 before:h-full before:w-1 before:origin-top before:scale-y-0 before:bg-gradient-to-b before:from-success before:to-success-accent before:transition-transform before:duration-300 hover:before:scale-y-100",
        product.containerClassName,
      )}>

      {/* 2. Media — square above the title through tablet, wider beside the text from laptop up */}
      <div className="relative aspect-square w-full shrink-0 overflow-hidden bg-foreground/10 laptop:aspect-auto laptop:w-[240px] laptop:self-stretch">
        <ProductImage key={selectedVariant?.id ?? "base"} imgUrl={displayedImages} productTitle={translation.title} />
        <ProductLikeButton className="absolute right-2 top-2 z-[90]" productId={product.id} categoryId={product.category_id} />
      </div>

      {/* 3. Content */}
      <div className="flex min-w-0 flex-1 flex-col gap-2 p-2 laptop:gap-3 laptop:p-4">

        {/* 4. Title + colored price pill */}
        <div className="flex flex-col gap-2 tablet:flex-row tablet:items-start tablet:justify-between">
          <Link className="line-clamp-2 min-w-0 text-sm font-semibold leading-snug text-title transition-colors duration-300 hover:text-success laptop:text-lg" href={`/${locale}/products/${product.id}`}>
            {translation.title}
          </Link>
          <span className="inline-flex shrink-0 items-center gap-1.5 self-start rounded border border-success/20 bg-success/10 px-2.5 py-1">
            <span className="hidden text-[11px] font-medium uppercase tracking-[0.14em] text-subTitle laptop:inline">{t("price")}</span>
            <span className="whitespace-nowrap text-sm font-bold tracking-tight text-success laptop:text-lg">
              {formatCurrency(selectedPrice)}
            </span>
          </span>
        </div>

        {/* 5. Stock + locked-variant badges */}
        <div className="hidden flex-wrap items-center gap-2 laptop:flex">
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
              <VariantImage src={getVariantImageUrl(product, selectedVariant)} alt={selectedVariant?.label || ""} />
              {selectedVariant && getProductVariantSelectionLabel(selectedVariant)}
            </span>
          )}
        </div>

        <section className="mt-auto hidden flex-wrap items-center gap-2 pt-1 laptop:flex">
          {!isOutOfStock && (
            <ProductQuantity productId={product.id} productPrice={selectedPrice} variantId={selectedVariant?.id} />
          )}
          {isOutOfStock ? (
            <div className="flex w-full justify-end">
              <RequestReplanishmentButton product={product} />
            </div>
          ) : (
            <>
              {personalizationConfig && (
                <PersonalizeButton className="h-8 min-h-0 px-2 text-xs" productId={product.id} variantId={selectedVariant?.id} />
              )}
              <ProductButtons
                ownerId={product.owner_id}
                productId={product.id}
                showViewButton={product.showViewButton}
                variantId={selectedVariant?.id}
                categoryId={product.category_id}
              />
            </>
          )}
        </section>

      </div>
    </article>
  )
}

export default memo(Product)
