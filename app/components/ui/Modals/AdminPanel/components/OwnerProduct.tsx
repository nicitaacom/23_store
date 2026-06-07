"use client"

import { useCurrentLocale } from "@/locales/client"
import { TProductDB } from "@/ts/product/TProductDB"
import { pt } from "@/utils/product"
import { twMerge } from "tailwind-merge"

import { OwnerProductImageSlider } from "./OwnerProductImageSlider"
import { OwnerProductHeader } from "./OwnerProductHeader"
import { FormatImagesForm } from "./FormatImagesForm"

export function OwnerProduct({ ...ownerProduct }: TProductDB) {
  const locale = useCurrentLocale()
  const translation = pt(ownerProduct, locale)

  return (
    <article className={twMerge("group overflow-hidden rounded border border-border-color/35 bg-foreground/55 shadow-none")}>
      <div className="flex flex-col tablet:flex-row">
        <div className="shrink-0 border-b border-border-color/35 bg-foreground/[0.02] tablet:border-b-0 tablet:border-r">
          <OwnerProductImageSlider images={ownerProduct.img_url} title={translation.title} />
        </div>
        <div className="min-w-0 flex-1 px-3 py-3 tablet:px-4 tablet:py-4">
          <OwnerProductHeader
            id={ownerProduct.id}
            translations={ownerProduct.translations}
            price={ownerProduct.price}
            onStock={ownerProduct.on_stock}
          />
        </div>
      </div>
      <div className="border-t border-border-color/35 bg-foreground/[0.02] px-2 py-2 tablet:px-3 tablet:py-3">
        <FormatImagesForm id={ownerProduct.id} imgUrl={ownerProduct.img_url} />
      </div>
    </article>
  )
}
