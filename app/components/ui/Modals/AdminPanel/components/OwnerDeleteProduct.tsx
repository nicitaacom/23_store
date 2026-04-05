"use client"

import { TProductDB } from "@/ts/product/TProductDB"
import { useCurrentLocale } from "@/locales/client"
import { pt } from "@/utils/product"
import { OWNER_PRODUCT_MEDIA_WRAPPER_CLASSNAME, OwnerProductImage } from "./OwnerProductImage"
import { Slider } from "@/components/ui"
import { DeleteProductHeader } from "./DeleteProductHeader"
import { twMerge } from "tailwind-merge"

interface OwnerDeleteProductProps extends TProductDB {
  onRequestDelete: (id: string, title: string) => void
}

export function OwnerDeleteProduct({ onRequestDelete, ...ownerProduct }: OwnerDeleteProductProps) {
  const locale = useCurrentLocale()
  const translation = pt(ownerProduct, locale)

  return (
    <article
      className={twMerge(
        "group overflow-hidden rounded border border-border-color/35 bg-foreground/55 shadow-none transition-[border-color,background-color] duration-150 hover:border-border-color/45 hover:bg-background/35",
      )}
      key={ownerProduct.id}>
      <div className="flex flex-col tablet:flex-row">
        <div className="shrink-0 border-b border-border-color/35 bg-foreground/[0.02] p-2 tablet:border-b-0 tablet:border-r tablet:p-3">
          {ownerProduct.img_url.length === 1 ? (
            <div className={OWNER_PRODUCT_MEDIA_WRAPPER_CLASSNAME}>
              <OwnerProductImage imgUrl={ownerProduct.img_url[0]} />
            </div>
          ) : (
            <div className={OWNER_PRODUCT_MEDIA_WRAPPER_CLASSNAME}>
              <Slider
                images={ownerProduct.img_url.map((image, index) => ({
                  src: image,
                  alt: `${translation.title}-${index + 1}`,
                }))}
                width={480}
                height={360}
                className="h-full w-full object-contain"
                containerClassName="h-full w-full overflow-hidden rounded bg-black/[0.04]"
              />
            </div>
          )}
        </div>
        <div className="flex w-full flex-col justify-between px-3 py-3 tablet:px-4 tablet:py-4">
          <DeleteProductHeader
            id={ownerProduct.id}
            title={translation.title}
            description={translation.description}
            price={ownerProduct.price}
            onRequestDelete={onRequestDelete}
          />
        </div>
      </div>
    </article>
  )
}
