import { Slider } from "@/components/ui"
import { TProductDB } from "@/interfaces/product/TProductDB"
import { IFormDataAddProduct } from "@/interfaces/product/IFormDataAddProduct"

import { OwnerProductImage } from "./OwnerProductImage"
import { OwnerProductHeader } from "./OwnerProductHeader"

export function OwnerProduct({ ...ownerProduct }: TProductDB) {
  return (
    <article
      className="flex flex-col tablet:flex-row justify-between border border-solid border-border-color"
      key={ownerProduct.id}>
      {ownerProduct.img_url.length === 1 ? (
        <OwnerProductImage imgUrl={ownerProduct.img_url[0]} />
      ) : (
        <Slider
          images={ownerProduct.img_url.map((image, index) => ({
            src: image,
            alt: `${ownerProduct.title}-${index + 1}`,
          }))}
          width={480}
          height={360}
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
