"use client"

import { TProductDB } from "@/ts/product/TProductDB"
import { FormatImagesForm } from "./FormatImagesForm"
import { OwnerProductImageSlider } from "./OwnerProductImageSlider"
import { OwnerProductHeader } from "./OwnerProductHeader"
import { VariantsForm } from "./VariantsForm"
import { useCurrentLocale } from "@/locales/client"
import { useLazyVisible } from "@/hooks/ui/useLazyVisible"

export function OwnerProduct({ ...ownerProduct }: TProductDB) {
  const locale = useCurrentLocale()
  const translation = ownerProduct.translations[locale] ?? ownerProduct.translations.fi
  const { ref, isVisible } = useLazyVisible()

  return (
    <div ref={ref}>
    {!isVisible ? (
      <div className="h-48 rounded border border-border-color/35 bg-foreground/55" />
    ) : (
    <article
      data-cy="owner-product"
      data-product-id={ownerProduct.id}
      className="overflow-hidden rounded border border-border-color/35 bg-foreground/55 shadow-none">
      <div className="flex flex-col tablet:flex-row">
        <div className="group shrink-0 border-b border-border-color/35 bg-foreground/[0.02] tablet:border-b-0 tablet:border-r">
          <OwnerProductImageSlider
            images={ownerProduct.img_url}
            title={translation.title}
          />
        </div>
        <div className="min-w-0 flex-1 px-3 py-3 tablet:px-4 tablet:py-4">
          <OwnerProductHeader
            id={ownerProduct.id}
            translations={ownerProduct.translations}
            price={ownerProduct.price}
            onStock={ownerProduct.on_stock}
            hasVariants={(ownerProduct.variants?.length ?? 0) > 0}
            category_id={ownerProduct.category_id}
          />
        </div>
      </div>
      <div className="border-t border-border-color/35 bg-foreground/[0.02] px-2 py-2 tablet:px-3 tablet:py-3">
        <FormatImagesForm
          id={ownerProduct.id}
          imgUrl={ownerProduct.img_url}
        />
      </div>
      <div className="border-t border-border-color/35 bg-foreground/[0.02] px-2 py-2 tablet:px-3 tablet:py-3">
        {/* key re-syncs the local draft when the gallery or variant set changes (e.g. after an image remap) */}
        <VariantsForm
          key={`${ownerProduct.img_url.join("|")}::${(ownerProduct.variants ?? []).map(variant => variant.id).join(",")}`}
          id={ownerProduct.id}
          imgUrl={ownerProduct.img_url}
          variants={ownerProduct.variants ?? null}
          price={ownerProduct.price}
        />
      </div>
    </article>
    )}
    </div>
  )
}
