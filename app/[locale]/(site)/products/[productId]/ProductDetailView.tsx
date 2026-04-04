"use client"

import Image from "next/image"
import { useEffect, useMemo, useState } from "react"
import { BsShieldCheck, BsStars } from "react-icons/bs"
import { FiCheckCircle, FiPackage, FiTruck } from "react-icons/fi"
import { twMerge } from "tailwind-merge"

import { AddToCartButton } from "@/components/ui/Buttons/AddToCartButton"
import { ProductQuantityButton } from "@/components/ui/Buttons/ProductQuantityButton"
import { Button } from "@/components/ui"
import { useCurrentLocale, useScopedI18n } from "@/locales/client"
import useCartStore from "@/store/user/cartStore"
import { TProductDB } from "@/ts/product/TProductDB"
import { formatCurrency } from "@/utils/currencyFormatter"
import { formatNumber } from "@/utils/numberFormatter"
import { pt } from "@/utils/product"
import { ManageProductButton } from "../../components/ManageProductButton"
import { RequestReplanishmentButton } from "../../components/Product/RequestReplanishmentButton"
import { ProductLikeButton } from "../../components/ProductLikeButton"

interface ProductDetailViewProps {
  product: TProductDB
}

export function ProductDetailView({ product }: ProductDetailViewProps) {
  const t = useScopedI18n("product")
  const locale = useCurrentLocale()
  const translation = pt(product, locale)
  const quantity = useCartStore(state => state.products?.[product.id]?.quantity ?? 0)
  const isOutOfStock = (product.on_stock ?? 0) <= 0

  const variants = useMemo(
    () => product.variants?.filter(variant => variant.label && variant.image_url) || [],
    [product.variants],
  )
  const [selectedVariantId, setSelectedVariantId] = useState(variants[0]?.id || "")
  const selectedVariant = variants.find(variant => variant.id === selectedVariantId) || variants[0]

  const galleryImages = useMemo(() => {
    const orderedImages = [selectedVariant?.image_url, ...(product.img_url || [])].filter((image): image is string => Boolean(image))
    const uniqueImages = orderedImages.filter((image, index) => orderedImages.indexOf(image) === index)
    return uniqueImages.length ? uniqueImages : ["/placeholder.jpg"]
  }, [product.img_url, selectedVariant?.image_url])

  const [activeImage, setActiveImage] = useState(galleryImages[0])

  useEffect(() => {
    setActiveImage(currentImage => (galleryImages.includes(currentImage) ? currentImage : galleryImages[0]))
  }, [galleryImages])

  const subtotal = formatCurrency(quantity * product.price)
  const availabilityLabel = isOutOfStock
    ? t("out_of_stock_label")
    : t("units_available", { count: formatNumber(product.on_stock ?? 0) })
  const activeImageIndex = Math.max(
    galleryImages.findIndex(image => image === activeImage),
    0,
  )

  const highlights = [
    {
      icon: FiTruck,
      label: t("fast_delivery"),
    },
    {
      icon: BsShieldCheck,
      label: t("secure_checkout"),
    },
    {
      icon: BsStars,
      label: t("support_ready"),
    },
  ]

  return (
    <div className="grid gap-6 laptop:grid-cols-[minmax(0,1.15fr)_minmax(340px,420px)]">
      <section className="grid gap-4 tablet:grid-cols-[88px_minmax(0,1fr)]">
        <div className="order-2 tablet:order-1">
          <div className="flex gap-3 overflow-x-auto pb-1 tablet:max-h-[720px] tablet:flex-col tablet:overflow-y-auto tablet:pb-0">
            {galleryImages.map((image, index) => (
              <button
                key={`${image}-${index}`}
                type="button"
                onClick={() => setActiveImage(image)}
                className={twMerge(
                  "group relative h-20 w-20 shrink-0 overflow-hidden rounded-[2px] border bg-background/70 transition-all duration-200",
                  activeImage === image
                    ? "border-success shadow-lg shadow-success/20"
                    : "border-border-color/20 hover:border-success/30 hover:bg-success/5",
                )}>
                <Image src={image} alt={`${translation.title}-${index + 1}`} fill className="object-cover" sizes="80px" />
              </button>
            ))}
          </div>
        </div>

        <div className="order-1 tablet:order-2">
          <div className="overflow-hidden rounded-[2px] border border-success/20 bg-[radial-gradient(circle_at_top_left,rgba(34,197,94,0.16),transparent_42%),linear-gradient(180deg,rgba(9,17,12,0.96),rgba(8,8,8,0.98))] shadow-2xl shadow-success/10">
            <div className="relative aspect-[4/5] w-full">
              <Image
                src={activeImage}
                alt={selectedVariant?.label || translation.title}
                fill
                priority
                sizes="(max-width: 768px) 100vw, (max-width: 1024px) 70vw, 50vw"
                className="object-contain p-6 mobile:p-10"
              />
            </div>
          </div>

          <div className="mt-3 flex items-center justify-between rounded-[2px] border border-border-color/20 bg-background/70 px-4 py-3 text-sm text-subTitle">
            <span className="truncate">{selectedVariant?.label || translation.title}</span>
            <span className="shrink-0 text-success">
              {activeImageIndex + 1}/{galleryImages.length}
            </span>
          </div>
        </div>
      </section>

      <aside className="flex flex-col gap-4">
        <section className="rounded-[2px] border border-success/20 bg-gradient-to-br from-success/10 via-background to-background p-5 shadow-2xl shadow-success/10 mobile:p-6">
          <div className="mb-4 flex flex-col gap-4">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={twMerge(
                  "inline-flex items-center gap-2 rounded-[2px] border px-3 py-1 text-xs font-medium uppercase tracking-[0.18em]",
                  isOutOfStock
                    ? "border-warning/30 bg-warning/10 text-warning"
                    : "border-success/30 bg-success/10 text-success",
                )}>
                <FiCheckCircle className="text-sm" />
                {availabilityLabel}
              </span>

              {selectedVariant && (
                <span className="inline-flex items-center gap-2 rounded-[2px] border border-border-color/20 bg-background/60 px-3 py-1 text-xs uppercase tracking-[0.18em] text-title">
                  <FiPackage className="text-sm text-success" />
                  {t("variant")}: {selectedVariant.label}
                </span>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <ManageProductButton productId={product.id} ownerId={product.owner_id} size="sm" />
              <ProductLikeButton
                productId={product.id}
                className="h-8 w-8 rounded-[2px] border-white/8 bg-[#000000] shadow-sm shadow-black/10 hover:border-warning/25 hover:bg-[#111111]"
              />
            </div>
          </div>

          <h1 className="max-w-[18ch] text-[28px] font-semibold leading-[1.02] tracking-[-0.03em] text-title mobile:text-[34px]">
            {translation.title}
          </h1>
          <p className="mt-3 max-w-[64ch] text-sm leading-6 text-subTitle mobile:text-base">{translation.description}</p>

          <div className="mt-5 grid gap-3 mobile:grid-cols-2">
            <div className="rounded-[2px] border border-success/20 bg-black/20 p-4">
              <p className="text-xs uppercase tracking-[0.24em] text-subTitle">{t("price")}</p>
              <p className="mt-2 text-2xl font-bold tracking-tight text-success">{formatCurrency(product.price)}</p>
            </div>

            <div className="rounded-[2px] border border-border-color/20 bg-background/50 p-4">
              <p className="text-xs uppercase tracking-[0.24em] text-subTitle">{t("on_stock")}</p>
              <p className="mt-2 text-base font-semibold text-title">{availabilityLabel}</p>
            </div>
          </div>

          {variants.length > 0 && (
            <div className="mt-5">
              <p className="mb-3 text-sm font-medium uppercase tracking-[0.2em] text-subTitle">{t("variant")}</p>

              <div className="flex flex-wrap gap-3">
                {variants.map(variant => {
                  const isActive = variant.id === selectedVariant?.id

                  return (
                    <button
                      key={variant.id}
                      type="button"
                      onClick={() => setSelectedVariantId(variant.id)}
                      className={twMerge(
                        "flex items-center gap-3 rounded-[2px] border px-3 py-3 text-left transition-all duration-200",
                        isActive
                          ? "border-success bg-success/10 shadow-lg shadow-success/10"
                          : "border-border-color/20 bg-background/40 hover:border-success/30 hover:bg-success/5",
                      )}>
                      <Image
                        src={variant.image_url}
                        alt={variant.label}
                        width={56}
                        height={56}
                        className="h-14 w-14 rounded-[2px] object-cover"
                      />
                      <span className="max-w-[160px] text-sm font-medium leading-5 text-title">{variant.label}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          )}
        </section>

        <section className="rounded-[2px] border border-success/25 bg-gradient-to-br from-success/12 via-background to-background p-5 shadow-2xl shadow-success/10 mobile:p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-subTitle">{t("selected_variant")}</p>
              <h2 className="mt-2 text-xl font-semibold leading-tight text-title">{selectedVariant?.label || translation.title}</h2>
            </div>

            {!isOutOfStock && quantity > 0 && (
              <div className="rounded-[2px] border border-success/20 bg-success/10 px-4 py-2 text-right">
                <p className="text-xs uppercase tracking-[0.2em] text-subTitle">{t("quantity")}</p>
                <p className="text-2xl font-bold text-success">{quantity}</p>
              </div>
            )}
          </div>

          {!isOutOfStock && quantity > 0 && (
            <div className="mt-4 rounded-[2px] border border-border-color/20 bg-background/60 p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm text-subTitle">{t("subtotal")}</p>
                <p className="text-2xl font-semibold text-title">{subtotal}</p>
              </div>
            </div>
          )}

          <div className="mt-5 flex flex-wrap gap-3">
            {isOutOfStock ? (
              <div className="w-full">
                <RequestReplanishmentButton product={product} />
              </div>
            ) : quantity === 0 ? (
              <AddToCartButton className="w-full justify-between px-5 mobile:w-full" productId={product.id} />
            ) : (
              <>
                <ProductQuantityButton action="decrease" productId={product.id} className="min-w-[56px]" />
                <ProductQuantityButton action="increase" productId={product.id} className="min-w-[56px]" />
                <ProductQuantityButton action="clear" productId={product.id} className="mobile:px-6" />
              </>
            )}
          </div>
        </section>

        <section className="rounded-[2px] border border-border-color/20 bg-background/70 p-5 mobile:p-6">
          <h2 className="text-lg font-semibold text-title">{t("product_details")}</h2>
          <p className="mt-3 text-base leading-7 text-subTitle">{translation.description}</p>

          <div className="mt-5 grid gap-3">
            {highlights.map(({ icon: Icon, label }) => (
              <div key={label} className="flex items-center gap-3 rounded-[2px] border border-border-color/20 bg-black/10 px-4 py-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-[2px] bg-success/10 text-success">
                  <Icon className="text-lg" />
                </div>
                <p className="text-sm font-medium text-title">{label}</p>
              </div>
            ))}
          </div>
        </section>
      </aside>
    </div>
  )
}
