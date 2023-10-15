import { MdOutlineDeleteOutline } from "react-icons/md"
import { HiOutlineRefresh } from "react-icons/hi"

import { IProduct } from "@/interfaces/IProduct"
import { Button } from "@/components/ui"
import {
  ClearProductQuantityButton,
  DecreaseProductQuantityButton,
  IncreaseProductQuantityButton,
} from "@/components/ui/Buttons"

export default function Product({ ...product }: IProduct) {
  return (
    <article className="flex flex-col tablet:flex-row justify-between border-t-[1px] border-b-[1px] border-solid border-gray-500">
      {product.on_stock === 0 ? (
        <div className="w-full flex flex-row justify-center tablet:justify-end items-end">
          <Button className="text-lg flex flex-row gap-x-2" variant="info-outline">
            Request replenishment
            <HiOutlineRefresh />
          </Button>
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
    </article>
  )
}
