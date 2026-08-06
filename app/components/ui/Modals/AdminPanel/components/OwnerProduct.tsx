"use client"

import { TProductDB } from "@/ts/product/TProductDB"
import { FormatImagesForm } from "./FormatImagesForm"
import { OwnerProductHeader } from "./OwnerProductHeader"
import { OwnerProductImageSlider } from "./OwnerProductImageSlider"
import { PersonalizationForm } from "./PersonalizationForm"
import { VariantsForm } from "./VariantsForm"
import { useCurrentLocale } from "@/locales/client"
import { useLazyVisible } from "@/hooks/ui/useLazyVisible"

// http://localhost:6006/?path=/story/admin-adminpanelmodal--add-product
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
      className="overflow-hidden rounded border border-border-color/35 bg-foreground/55 shadow-none"
      data-cy="owner-product"
      data-product-id={ownerProduct.id}>
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
          title={ownerProduct.translations.fi.title}
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
      <div className="border-t border-border-color/35 bg-foreground/[0.02] px-2 py-2 tablet:px-3 tablet:py-3">
        {/* Same editor as the product's manage page, mounted here so the print area is reachable
            from Product workspace -> Edit product without leaving the modal */}
        <PersonalizationForm
          className="rounded-none border-0 bg-transparent p-0 shadow-none"
          imageUrls={ownerProduct.img_url}
          productId={ownerProduct.id}
          personalization={ownerProduct.personalization}
        />
      </div>
    </article>
    )}
    </div>
  )
}
