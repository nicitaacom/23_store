"use client"

import { MdOutlineDeleteOutline } from "react-icons/md"
import { Button } from ".."
import useCartStore from "@/store/user/cartStore"
import { useCallback } from "react"

type ProductQuantityAction = "increase" | "decrease" | "clear"

interface ProductQuantityButtonProps {
  className?: string
  productId: string
  productOnStock?: number
  action: ProductQuantityAction
}

export function ProductQuantityButton({ className, productId, productOnStock, action }: ProductQuantityButtonProps) {
  const { increaseProductQuantity, decreaseProductQuantity, clearProductQuantity } = useCartStore()

  // 1. Handle button click based on action type
  const handleClick = useCallback(() => {
    if (action === "increase" && productOnStock) increaseProductQuantity(productId)
    if (action === "decrease") decreaseProductQuantity(productId)
    if (action === "clear") clearProductQuantity(productId)
  }, [action, productId, productOnStock, increaseProductQuantity, decreaseProductQuantity, clearProductQuantity])

  // 2. Get button config based on action
  const config = {
    increase: { variant: "success-outline" as const, content: "+", icon: null },
    decrease: { variant: "danger-outline" as const, content: "-", icon: null },
    clear: { variant: "danger-outline" as const, content: "Clear", icon: <MdOutlineDeleteOutline /> },
  }[action]

  return (
    <Button
      className={`min-w-[50px] max-h-[50px] h-[50px] laptop:w-fit ${action === "clear" ? "font-secondary text-xl font-thin" : "text-2xl"} ${className}`}
      variant={config.variant}
      onClick={handleClick}>
      {config.content}
      {config.icon}
    </Button>
  )
}
