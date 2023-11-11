import { memo, useEffect, useRef } from "react"
import { FieldErrors, Form, UseFormRegister } from "react-hook-form"

import { Slider } from "@/components/ui"
import { IDBProduct } from "@/interfaces/IDBProduct"
import { IFormDataAddProduct } from "@/interfaces/IFormDataAddProduct"

import { OwnerProductImage } from "./OwnerProductImage"
import { OwnerProductHeader } from "./OwnerProductHeader"

type Props = IDBProduct

export function OwnerProduct({ ...ownerProduct }: Props) {
  return (
    <article
      className="flex flex-col tablet:flex-row justify-between border border-solid border-border-color"
      key={ownerProduct.id}>
      {ownerProduct.img_url.length === 1 ? (
        <OwnerProductImage imgUrl={ownerProduct.img_url[0]} />
      ) : (
        <Slider
          containerClassName="h-[300px] tablet:w-fit tablet:h-[125px] laptop:h-[150px]"
          className="h-[300px] tablet:h-[125px] laptop:h-[150px] desktop:h-[150px]"
          images={ownerProduct.img_url}
          title={ownerProduct.title}
        />
      )}
      <div className="flex flex-col justify-between gap-y-8 tablet:gap-y-0 w-full px-2 py-2">
        <OwnerProductHeader
          id={ownerProduct.id}
          title={ownerProduct.title as keyof IFormDataAddProduct}
          subTitle={ownerProduct.sub_title}
          price={ownerProduct.price}
          onStock={ownerProduct.on_stock}
        />
      </div>
    </article>
  )
}
