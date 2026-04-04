"use client"

import { MdOutlineDeleteOutline } from "react-icons/md"
import { Button } from ".."
import useCartStore from "@/store/user/cartStore"
import { useCallback } from "react"
import { twMerge } from "tailwind-merge"

type ProductQuantityAction = "increase" | "decrease" | "clear"

interface ProductQuantityButtonProps {
  className?: string
  productId: string
  action: ProductQuantityAction
}

export function ProductQuantityButton({ className, productId, action }: ProductQuantityButtonProps) {
  const { increaseProductQuantity, decreaseProductQuantity, clearProductQuantity } = useCartStore()

  // 1. Handle button click based on action type
  const handleClick = useCallback(() => {
    action === "increase" && increaseProductQuantity(productId)
    action === "decrease" && decreaseProductQuantity(productId)
    action === "clear" && clearProductQuantity(productId)
  }, [action, productId, increaseProductQuantity, decreaseProductQuantity, clearProductQuantity])

  // 2. Get button config based on action
  const config = {
    increase: {
      variant: "success-outline" as const,
      content: "+",
      icon: null,
      size: "icon-md" as const,
    },
    decrease: {
      variant: "danger-outline" as const,
      content: "-",
      icon: null,
      size: "icon-md" as const,
    },
    clear: {
      variant: "danger-outline" as const,
      content: "Clear",
      icon: <MdOutlineDeleteOutline />,
      size: "md" as const,
    },
  }[action]

  return (
    <Button
      className={twMerge(
        "rounded font-medium transition-all",
        action === "clear"
          ? "w-full mobile:w-fit"
          : "min-w-10 text-lg",
        className,
      )}
      variant={config.variant}
      size={config.size}
      rounded="lg"
      shadow="sm"
      rightIcon={config.icon}
      onClick={handleClick}>
      {config.content}
    </Button>
  )
}
