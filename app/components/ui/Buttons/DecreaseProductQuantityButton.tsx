"use client"
import { IProduct } from "@/interfaces/IProduct"
import { Button } from ".."

export default function DecreaseProductQuantityButton({ product }: { product: IProduct }) {
  return (
    <Button className="min-w-[50px] max-h-[50px] laptop:w-fit text-2xl" variant="danger-outline" onClick={() => {}}>
      -
    </Button>
  )
}
