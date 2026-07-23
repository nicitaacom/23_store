"use client"

import { useCallback } from "react"
import { MdOutlineDeleteOutline } from "react-icons/md"
import { twMerge } from "tailwind-merge"

import { Button } from ".."
import useCartStore from "@/store/user/cartStore"

type ProductQuantityAction = "increase" | "decrease" | "clear"

interface ProductQuantityButtonProps {
  className?: string
  productId: string
  action: ProductQuantityAction
  variantId?: string | null
}

export function ProductQuantityButton({ className, productId, action, variantId }: ProductQuantityButtonProps) {
  const { increaseProductQuantity, decreaseProductQuantity, clearProductQuantity } = useCartStore()

  // 1. Handle button click based on action type
  const handleClick = useCallback(() => {
    if (action === "increase") {
      increaseProductQuantity(productId, variantId)
      return
    }

    if (action === "decrease") {
      decreaseProductQuantity(productId, variantId)
      return
    }

    clearProductQuantity(productId, variantId)
  }, [action, productId, variantId, increaseProductQuantity, decreaseProductQuantity, clearProductQuantity])

  // 2. Stepper buttons (+/−) share icon-button primitive with no outer border (parent provides the border)
  if (action === "increase" || action === "decrease") {
    return (
      <button
        className={twMerge(
          "inline-flex h-8 w-8 items-center justify-center bg-background/55 text-sm font-semibold text-icon-color transition-colors duration-150 hover:bg-foreground/50",
          action === "increase" ? "text-success" : "text-danger",
          className,
        )}
        type="button"
        onClick={handleClick}>
        {action === "increase" ? "+" : "−"}
      </button>
    )
  }

  // 3. Clear — danger icon button
  return (
    <Button
      className={twMerge("rounded font-medium w-full mobile:w-fit", className)}
      variant="danger-outline"
      size="md"
      rounded="lg"
      shadow="sm"
      rightIcon={<MdOutlineDeleteOutline className="text-danger" />}
      onClick={handleClick}>
      Clear
    </Button>
  )
}
