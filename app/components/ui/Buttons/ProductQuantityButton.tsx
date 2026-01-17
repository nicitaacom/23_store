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
    action === "increase" && productOnStock && increaseProductQuantity(productId)
    action === "decrease" && decreaseProductQuantity(productId)
    action === "clear" && clearProductQuantity(productId)
  }, [action, productId, productOnStock, increaseProductQuantity, decreaseProductQuantity, clearProductQuantity])

  // 2. Get button config based on action
  const config = {
    increase: {
      variant: "success-outline" as const,
      content: "+",
      icon: null,
      size: "icon-lg" as const,
      rounded: "lg" as const,
    },
    decrease: {
      variant: "danger-outline" as const,
      content: "-",
      icon: null,
      size: "icon-lg" as const,
      rounded: "lg" as const,
    },
    clear: {
      variant: "danger-outline" as const,
      content: "Clear",
      icon: <MdOutlineDeleteOutline className="text-xl" />,
      size: "lg" as const,
      rounded: "lg" as const,
    },
  }[action]

  return (
    <Button
      className={`font-semibold hover:shadow-lg transition-all ${
        action === "clear" ? "font-secondary text-lg font-medium" : "text-2xl"
      } ${className}`}
      variant={config.variant}
      size={config.size}
      rounded={config.rounded}
      shadow="sm"
      rightIcon={config.icon}
      onClick={handleClick}>
      {config.content}
    </Button>
  )
}
