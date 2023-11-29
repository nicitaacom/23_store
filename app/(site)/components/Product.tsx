"use client"

import { memo } from "react"
import Image from "next/image"

import { formatCurrency } from "@/utils/currencyFormatter"
import { IProduct } from "@/interfaces/IProduct"
import { Slider } from "@/components/ui"
import {
  IncreaseProductQuantityButton,
  ClearProductQuantityButton,
  DecreaseProductQuantityButton,
  RequestReplanishmentButton,
} from "@/components/ui/Buttons"

type Props = IProduct & {
  quantity: number
  increaseProductQuantity: (id: string) => void
  decreaseProductQuantity: (id: string) => void
  clearProductQuantity: (id: string) => void
}

function Product({ ...product }: Props) {
  return (
    <article className="flex flex-col tablet:flex-row justify-between border-t-[1px] border-b-[1px] border-solid border-border-color">
      {product.img_url.length === 1 ? (
        <figure className="relative w-full tablet:aspect-video h-[500px] tablet:h-[175px] laptop:h-[200px] desktop:h-[250px] tablet:w-fit object-coverw">
          <Image
            className="w-full tablet:aspect-video h-[500px] tablet:h-[175px] laptop:h-[200px] desktop:h-[250px] tablet:w-fit object-cover"
            src={product.img_url[0]}
            alt="image"
            width={480}
            height={360}
            priority
          />
        </figure>
      ) : (
        <Slider
          images={product.img_url.map((image, index) => ({
            src: image,
            alt: `${product.title}-${index + 1}`,
          }))}
          width={480}
          height={360}
          swipeable={false}
        />
      )}
      <div className="flex flex-col justify-between gap-y-8 tablet:gap-y-0 w-full px-2 py-2">
        <section className="flex flex-col gap-y-4 tablet:gap-y-0 justify-between items-center tablet:items-start text-brand">
          <div className="flex flex-col mobile:flex-row gap-x-2 justify-between items-center w-full">
            <h1
              className={`w-full mobile:w-[60%] text-2xl text-center mobile:text-start tablet:text-xl desktop:text-2xl overflow-hidden ${
                product.on_stock === 0 ? "line-clamp-1" : "line-clamp-2"
              }`}>
              {product.title}
            </h1>
            <h1 className="w-full mobile:w-[35%] text-2xl text-center mobile:text-end tablet:text-lg desktop:text-xl">
              {formatCurrency(product.price)}
            </h1>
          </div>
          <div className="w-[70%] flex flex-col">
            <h1
              className={`overflow-hidden ${product.on_stock === 0 ? "line-clamp-1" : "line-clamp-2"}
             text-lg tablet:text-sm text-subTitle text-center tablet:text-start`}>
              {product.sub_title}
            </h1>
            <p
              className={`text-lg tablet:text-sm text-subTitle text-center tablet:text-start
            ${product.on_stock === 0 && "text-warning"}`}>
              {product.on_stock === 0 ? "Out of stock" : `Left on stock:${product.on_stock}`}
            </p>
          </div>
        </section>

        <section className="min-h-[50px] flex flex-col tablet:flex-row gap-y-4 gap-x-4 justify-between">
          <div className={`flex flex-col justify-center ${product.quantity === 0 ? "hidden" : "flex"}`}>
            <h5 className={`text-xl tablet:text-base laptop:text-lg text-center tablet:text-start`}>
              Quantity: <span>{product.quantity}</span>
            </h5>
            <h5 className="text-xl tablet:text-base laptop:text-lg text-center tablet:text-start flex flex-row justify-center tablet:justify-start">
              Sub-total:&nbsp;<p>{formatCurrency(product.quantity * product.price)}</p>
            </h5>
          </div>
          {product.on_stock === 0 ? (
            <div className="flex flex-row justify-center tablet:justify-end items-end">
              <RequestReplanishmentButton />
            </div>
          ) : (
            <div
              className={`flex flex-row gap-x-2 justify-center tablet:justify-end items-end 
            ${product.quantity === 0 && "w-full"}`}>
              <IncreaseProductQuantityButton onClick={() => product.increaseProductQuantity(product.id)} />
              <DecreaseProductQuantityButton onClick={() => product.decreaseProductQuantity(product.id)} />
              <ClearProductQuantityButton onClick={() => product.clearProductQuantity(product.id)} />
            </div>
          )}
        </section>
      </div>
    </article>
  )
}

export default memo(Product)
