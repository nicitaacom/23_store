"use client"

import { useCurrentLocale } from "@/locales/client"
import { TProductDB } from "@/ts/product/TProductDB"
import { pt } from "@/utils/product"
import { twMerge } from "tailwind-merge"

import { OwnerProductImageSlider } from "./OwnerProductImageSlider"
import { OwnerProductHeader } from "./OwnerProductHeader"

export function OwnerProduct({ ...ownerProduct }: TProductDB) {
  const locale = useCurrentLocale()
  const translation = pt(ownerProduct, locale)

  return (
    <article className={twMerge("group overflow-hidden rounded border border-border-color/35 bg-foreground/55 shadow-none")}>
      <div className="flex flex-col tablet:flex-row">
        <div className="shrink-0 border-b border-border-color/35 bg-foreground/[0.02] tablet:border-b-0 tablet:border-r">
          <OwnerProductImageSlider images={ownerProduct.img_url} title={translation.title} />
        </div>
        <div className="flex w-full flex-col justify-between px-3 py-3 tablet:px-4 tablet:py-4">
          <OwnerProductHeader
            id={ownerProduct.id}
            translations={ownerProduct.translations}
            price={ownerProduct.price}
            onStock={ownerProduct.on_stock}
            imgUrl={ownerProduct.img_url}
          />
        </div>
      </div>
    </article>
  )
}
