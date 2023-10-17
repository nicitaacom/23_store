"use client"

import { MdOutlineDeleteOutline } from "react-icons/md"

import { Button } from ".."
import { IProduct } from "@/interfaces/IProduct"

async function clearProductQuantity(product: IProduct) {}

export default function ClearProductQuantityButton({ product }: { product: IProduct }) {
  return (
    <Button
      className="font-secondary font-thin max-h-[50px]"
      variant="danger-outline"
      onClick={() => clearProductQuantity(product)}>
      Clear <MdOutlineDeleteOutline />
    </Button>
  )
}
