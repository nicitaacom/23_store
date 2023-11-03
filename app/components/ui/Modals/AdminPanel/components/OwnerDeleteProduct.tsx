"use client"

import { IDBProduct } from "@/interfaces/IDBProduct"
import { OwnerProductImage } from "./OwnerProductImage"
import { Slider } from "@/components/ui"
import { OwnerProductHeader } from "./OwnerProductHeader"

type Props = IDBProduct

export function OwnerDeleteProduct({ ...ownerProduct }: Props) {
  return (
    <article
      className="flex flex-col tablet:flex-row justify-between border border-solid border-border-color"
      key={ownerProduct.id}>
      {ownerProduct.img_url.length === 1 ? (
        <OwnerProductImage imgUrl={ownerProduct.img_url[0]} />
      ) : (
        <Slider images={ownerProduct.img_url} title={ownerProduct.title} />
      )}
      <div className="flex flex-col justify-between gap-y-8 tablet:gap-y-0 w-full px-2 py-2">
        <div>Header in the future</div>
      </div>
    </article>
  )
}
