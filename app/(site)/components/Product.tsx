import { HiOutlineRefresh } from "react-icons/hi"

import { IProduct } from "@/interfaces/IProduct"
import { Button, Slider } from "@/components/ui"
import {
  ClearProductQuantityButton,
  DecreaseProductQuantityButton,
  IncreaseProductQuantityButton,
  RequestReplanishmentButton,
} from "@/components/ui/Buttons"
import Image from "next/image"
import { formatCurrency } from "@/utils/currencyFormatter"

export default function Product({ ...product }: IProduct) {
  return (
    <article className="flex flex-col tablet:flex-row justify-between border-t-[1px] border-b-[1px] border-solid border-gray-500">
      {product.img_url.length === 1 ? (
        <Image
          className="w-full tablet:aspect-video h-[300px] tablet:h-[175px] laptop:h-[200px] desktop:h-[250px] tablet:w-fit object-cover"
          src={product.img_url[0]}
          alt="image"
          width={720}
          height={480}
        />
      ) : (
        <Slider
          containerClassName="tablet:w-fit"
          className="h-[300px]"
          images={product.img_url}
          title={product.title}
        />
      )}
      <section className="flex flex-col justify-between gap-y-8 tablet:gap-y-0 w-full px-4 pt-2 pb-4">
        <section className="flex flex-col gap-y-4 tablet:gap-y-0 justify-between items-center tablet:items-start text-brand">
          <div className="flex flex-row gap-x-2 justify-between items-center w-full">
            <h1 className="text-2xl tablet:text-xl desktop:text-2xl">{product.title}</h1>
            <h1 className="text-2xl tablet:text-lg desktop:text-xl">{formatCurrency(product.price)}</h1>
          </div>
          <div className="flex flex-col">
            <p className="text-lg tablet:text-sm text-subTitle text-center tablet:text-start">{product.sub_title}</p>
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
            <div className="w-full flex flex-row justify-center tablet:justify-end items-end">
              <RequestReplanishmentButton />
            </div>
          ) : (
            <div
              className={`flex flex-row gap-x-2 justify-center tablet:justify-end items-end 
            ${product.quantity === 0 && "w-full"}`}>
              <IncreaseProductQuantityButton />
              <DecreaseProductQuantityButton />
              <ClearProductQuantityButton />
            </div>
          )}
        </section>
      </section>
    </article>
  )
}