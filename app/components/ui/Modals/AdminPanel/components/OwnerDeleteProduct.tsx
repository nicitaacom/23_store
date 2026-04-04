"use client"

import { TProductDB } from "@/ts/product/TProductDB"
import { useCurrentLocale } from "@/locales/client"
import { pt } from "@/utils/product"
import { OwnerProductImage } from "./OwnerProductImage"
import { Slider } from "@/components/ui"
import { DeleteProductHeader } from "./DeleteProductHeader"

export function OwnerDeleteProduct({ ...ownerProduct }: TProductDB) {
  const locale = useCurrentLocale()
  const translation = pt(ownerProduct, locale)

  return (
    <article
      className="overflow-hidden rounded-2xl border border-border-color/70 bg-background/25 shadow-sm"
      key={ownerProduct.id}>
      <div className="flex flex-col tablet:flex-row">
        <div className="shrink-0 border-b border-border-color/50 tablet:border-b-0 tablet:border-r">
          {ownerProduct.img_url.length === 1 ? (
            <OwnerProductImage imgUrl={ownerProduct.img_url[0]} />
          ) : (
            <Slider
              images={ownerProduct.img_url.map((image, index) => ({
                src: image,
                alt: `${translation.title}-${index + 1}`,
              }))}
              width={480}
              height={360}
            />
          )}
        </div>
        <div className="flex w-full flex-col justify-between px-4 py-4 tablet:px-5">
          <DeleteProductHeader
            id={ownerProduct.id}
            title={translation.title}
            description={translation.description}
            price={ownerProduct.price}
          />
        </div>
      </div>
    </article>
  )
}
