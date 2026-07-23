"use client"

import { useMemo } from "react"
import Image from "next/image"
import { BsShieldCheck, BsStars } from "react-icons/bs"
import { FiCheckCircle, FiTruck } from "react-icons/fi"
import { twMerge } from "tailwind-merge"

import { TProductDB } from "@/ts/product/TProductDB"
import { useProductDetailViewSync } from "./hooks/useProductDetailViewSync"
import { ManageProductButton } from "../../components/ManageProductButton"
import { ProductLikeButton } from "../../components/ProductLikeButton"
import { createCartProductKey, getProductPriceForVariant } from "@/utils/cartProducts"
import { formatCurrency } from "@/utils/currencyFormatter"
import { formatNumber } from "@/utils/numberFormatter"
import useCartStore from "@/store/user/cartStore"
import { useCurrentLocale, useScopedI18n } from "@/locales/client"
import { useProductDetail } from "@/store/ui/useProductDetail"
import { AddToCartButton } from "@/components/ui/Buttons/AddToCartButton"
import { MarkdownText } from "@/components/ui/MarkdownText"
import { ProductQuantityButton } from "@/components/ui/Buttons/ProductQuantityButton"
import { RequestReplanishmentButton } from "@/components/Product/RequestReplanishmentButton"

interface ProductDetailViewProps {
  product: TProductDB
  isAuthenticated: boolean
}

export function ProductDetailView({ product, isAuthenticated }: ProductDetailViewProps) {
  const t = useScopedI18n("product")
  const locale = useCurrentLocale()
  const { products } = useCartStore()
  const { selectedVariantId, activeImage: storedImage } = useProductDetail()

  const variants = useMemo(
    () => product.variants?.filter(variant => variant.label && variant.image_url) || [],
    [product.variants],
  )
  const selectedVariant = variants.find(variant => variant.id === selectedVariantId) || variants[0]
  const galleryImages = useMemo(() => {
    const orderedImages = [selectedVariant?.image_url, ...(product.img_url || [])].filter((image): image is string =>
      Boolean(image),
    )
    const uniqueImages = orderedImages.filter((image, index) => orderedImages.indexOf(image) === index)
    return uniqueImages.length ? uniqueImages : ["/placeholder.jpg"]
  }, [product.img_url, selectedVariant?.image_url])
  const activeImage = galleryImages.includes(storedImage) ? storedImage : galleryImages[0]

  const { handleSelectVariant, handleSelectImage } = useProductDetailViewSync({
    product,
    isAuthenticated,
    variants,
    galleryImages,
  })

  const translation = product.translations[locale] ?? product.translations.fi
  const isOutOfStock = (product.on_stock ?? 0) <= 0
  const isLowStock = (product.on_stock ?? 0) < 50 && !isOutOfStock
  const selectedPrice = getProductPriceForVariant(product, selectedVariant?.id)
  const quantity = products?.[createCartProductKey(product.id, selectedVariant?.id)]?.quantity ?? 0
  const subtotal = formatCurrency(quantity * selectedPrice)
  const availabilityLabel = isOutOfStock
    ? t("out_of_stock_label")
    : t("units_available", { count: formatNumber(product.on_stock ?? 0) })
  const highlights = useMemo(
    () => [
      { icon: FiTruck, label: t("fast_delivery") },
      { icon: BsShieldCheck, label: t("secure_checkout") },
      { icon: BsStars, label: t("support_ready") },
    ],
    [t],
  )

  const renderedThumbnails = useMemo(
    () =>
      galleryImages.map((image, index) => (
        <button
          key={`${image}-${index}`}
          type="button"
          onClick={() => handleSelectImage(image)}
          className={twMerge(
            "group relative h-16 w-16 shrink-0 overflow-hidden rounded-[2px] border bg-foreground/5 transition-colors duration-150",
            activeImage === image ? "border-success" : "border-border-color/20 hover:border-success/30 hover:bg-success/5",
          )}>
          <Image src={image} alt={`${translation.title}-${index + 1}`} fill className="object-cover" sizes="80px" />
        </button>
      )),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- handleSelectImage is a stable store action, never add fns to deps
    [galleryImages, activeImage, translation.title],
  )

  const renderedVariants = useMemo(
    () =>
      variants.map(variant => (
        <button
          key={variant.id}
          type="button"
          onClick={() => handleSelectVariant(variant.id)}
          className={twMerge(
            "flex h-20 items-center gap-3 rounded-[2px] border px-3 text-left transition-colors duration-150",
            variant.id === selectedVariant?.id
              ? "border-success bg-success/10"
              : "border-border-color/20 bg-background/40 hover:border-success/30 hover:bg-success/5",
          )}>
          <Image
            src={variant.image_url}
            alt={variant.label}
            width={64}
            height={64}
            className="h-14 w-14 rounded-[2px] object-cover"
          />
          <div className="min-w-0">
            <span className="block text-base font-medium text-title">{variant.label}</span>
            <span className="text-sm text-success">{formatCurrency(variant.price)}</span>
          </div>
        </button>
      )),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- handleSelectVariant is a stable store action, never add fns to deps
    [variants, selectedVariant],
  )

  const renderedHighlights = useMemo(
    () =>
      highlights.map(({ icon: Icon, label }) => (
        <div
          key={label}
          className="flex items-center gap-2 rounded-[2px] border border-border-color/20 bg-foreground/5 px-3 py-2">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[2px] bg-success/10 text-success">
            <Icon className="text-lg" />
          </div>
          <p className="text-sm font-medium text-title">{label}</p>
        </div>
      )),
    [highlights],
  )

  return (
    <div className="grid items-start gap-3 laptop:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      {/* Left column: gallery + gif */}
      <section className="grid gap-2 tablet:grid-cols-[72px_minmax(0,1fr)]">
        <div className="order-2 tablet:order-1">
          <div className="flex gap-2 overflow-x-auto pb-1 tablet:flex-col tablet:overflow-y-auto tablet:pb-0">
            {renderedThumbnails}
          </div>
        </div>

        <div className="order-1 tablet:order-2 flex flex-col gap-2">
          <div className="overflow-hidden rounded-[2px] border border-success/20 bg-foreground/5">
            <div className="relative aspect-square w-full max-h-[480px]">
              <Image
                src={activeImage}
                alt={selectedVariant?.label || translation.title}
                fill
                priority
                sizes="(max-width: 768px) 100vw, (max-width: 1024px) 70vw, 50vw"
                className="object-contain p-4 mobile:p-6"
              />
            </div>
          </div>

          {variants.length > 0 && <div className="flex flex-wrap items-stretch gap-2">{renderedVariants}</div>}

          {isLowStock && (
            <div className="w-full overflow-hidden rounded-[2px] border border-warning/30 bg-warning/5">
              <p className="px-3 py-2 text-sm font-medium text-warning">
                {t("low_stock_hurry", { count: product.on_stock ?? 0 })}
              </p>
              <Image
                src="/banners/run-to-grab-discount.gif"
                alt="Hurry!"
                width={800}
                height={600}
                className="mx-auto h-auto w-full max-w-[320px]"
              />
            </div>
          )}
        </div>
      </section>

      {/* Right column: product info */}
      <aside className="flex flex-col gap-2">
        <section className="flex flex-col gap-2 rounded-[2px] border border-success/20 bg-foreground/5 p-3">
          {/* Badges row */}
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={twMerge(
                "inline-flex items-center gap-2 rounded-[2px] border px-3 py-1 text-xs font-medium uppercase tracking-[0.18em]",
                isOutOfStock ? "border-warning/30 bg-warning/10 text-warning" : "border-success/30 bg-success/10 text-success",
              )}>
              <FiCheckCircle className="text-sm" />
              {availabilityLabel}
            </span>
          </div>

          {/* Price */}
          <p className="text-2xl font-bold tracking-tight text-success">{formatCurrency(selectedPrice)}</p>

          {/* Admin controls */}
          <div className="flex flex-wrap items-center gap-2">
            <ManageProductButton productId={product.id} ownerId={product.owner_id} size="sm" />
            <ProductLikeButton
              productId={product.id}
              categoryId={product.category_id}
              className="h-8 w-8 rounded-[2px] border-border-color/20 bg-foreground/5 hover:border-warning/25 hover:bg-foreground/10"
            />
          </div>

          {/* Title + buy control */}
          <div className="flex items-start justify-between gap-3">
            <h1 className="text-xl font-semibold leading-tight tracking-tight text-title mobile:text-2xl">{translation.title}</h1>
            <div className="flex shrink-0 items-center gap-1">
              {isOutOfStock ? (
                <RequestReplanishmentButton product={product} className="h-11 rounded-[2px] shadow-none" />
              ) : quantity === 0 ? (
                <AddToCartButton
                  className="h-11 justify-between rounded-[2px] px-5 shadow-none"
                  productId={product.id}
                  variantId={selectedVariant?.id}
                  categoryId={product.category_id}
                />
              ) : (
                <>
                  <ProductQuantityButton
                    action="decrease"
                    productId={product.id}
                    variantId={selectedVariant?.id}
                    className="h-11 w-11 rounded-[2px] border border-border-color/20"
                  />
                  <ProductQuantityButton
                    action="increase"
                    productId={product.id}
                    variantId={selectedVariant?.id}
                    className="h-11 w-11 rounded-[2px] border border-border-color/20"
                  />
                  <ProductQuantityButton
                    action="clear"
                    productId={product.id}
                    variantId={selectedVariant?.id}
                    className="h-11 rounded-[2px] px-4 shadow-none"
                  />
                </>
              )}
            </div>
          </div>

          {/* Subtotal (only when items in cart) */}
          {!isOutOfStock && quantity > 0 && (
            <div className="flex items-center justify-between rounded-[2px] border border-border-color/20 bg-foreground/5 px-3 py-2">
              <p className="text-sm text-subTitle">{t("subtotal")}</p>
              <p className="text-xl font-semibold text-title">{subtotal}</p>
            </div>
          )}
        </section>

        {/* Product details */}
        <section className="flex flex-col gap-2 rounded-[2px] border border-border-color/20 bg-foreground/5 p-3">
          <h2 className="text-sm font-semibold text-title">{t("product_details")}</h2>
          <p className="text-sm leading-6 text-subTitle">
            <MarkdownText text={translation.description} />
          </p>

          <div className="grid gap-2">{renderedHighlights}</div>
        </section>
      </aside>
    </div>
  )
}
