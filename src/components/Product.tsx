import { MdOutlineDeleteOutline } from "react-icons/md"
import {HiOutlineRefresh} from 'react-icons/hi'

import { formatCurrency } from "../utils/currencyFormatter"
import useUserCartStore from "../store/user/userCartStore"
import { IProduct } from "../interfaces/IProduct"
import { Button } from "./ui/"
import { Slider } from "./Slider"

export function Product({ ...product }: IProduct) {
  const userCartStore = useUserCartStore()

  const matchingProduct = userCartStore.products.find(item => item.id === product.id)
  const productQuantity = matchingProduct ? matchingProduct.quantity : 0

  return (
    <article className="flex flex-col tablet:flex-row justify-between border-t-[1px] border-b-[1px] border-solid border-gray-500">
      {product.img_url.length === 1 ? (
        <img
          className="w-full tablet:aspect-video h-[300px] tablet:h-[175px] laptop:h-[200px] desktop:h-[250px] tablet:w-fit object-cover"
          src={product.img_url[0]}
          alt="image"
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
            <p className={`text-lg tablet:text-sm text-subTitle text-center tablet:text-start
            ${product.on_stock === 0 && 'text-warning'}`}>
               {product.on_stock === 0 ? 'Out of stock' : `Left on stock:${product.on_stock}`}
            </p>
          </div>
        </section>
        <section className="min-h-[56px] flex flex-col tablet:flex-row gap-y-4 gap-x-4 justify-between">
          <div className={`flex flex-col ${productQuantity === 0 ? "hidden" : "flex"}`}>
            <h5 className={`text-xl tablet:text-base laptop:text-lg text-center tablet:text-start`}>
              Quantity: <span>{productQuantity}</span>
            </h5>
            <h5 className="text-xl tablet:text-base laptop:text-lg text-center tablet:text-start flex flex-row justify-center tablet:justify-start">
              Sub-total:&nbsp;<p>{formatCurrency(productQuantity * product.price)}</p>
            </h5>
          </div>
          {product.on_stock === 0 ? 
          <div className="w-full flex flex-row justify-center tablet:justify-end items-end">
            <Button className="text-lg flex flex-row gap-x-2" variant='info-outline'>
            Request replenishment
            <HiOutlineRefresh/>
          </Button>
          </div>
          :
          <div
            className={`flex flex-row gap-x-2 justify-center tablet:justify-end items-end 
            ${productQuantity === 0 && "w-full"}`}>
            <Button
              className="min-w-[50px] max-h-[50px] laptop:w-fit text-2xl"
              variant="danger-outline"
              onClick={() => userCartStore.decreaseProductQuantity(product)}>
              -
            </Button>
            <Button
              className="min-w-[50px] max-h-[50px] laptop:w-fit text-2xl"
              variant="success-outline"
              onClick={() => userCartStore.increaseProductQuantity(product)}>
              +
            </Button>
            <Button
              className="font-secondary font-thin max-h-[50px]"
              variant="danger-outline"
              onClick={() => userCartStore.setProductQuantity0(product)}>
              Clear <MdOutlineDeleteOutline />
            </Button>
          </div>}
        </section>
      </section>
    </article>
  )
}
