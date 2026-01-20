"use client"

import { BsCart3 } from "react-icons/bs"

import { useScopedI18n } from "@/locales/client"
import useCartStore from "@/store/user/cartStore"
import { Button } from "@/components/ui"

interface AddToCartButtonProps {
  productId: string
  className?: string
}

export function AddToCartButton({ productId, className }: AddToCartButtonProps) {
  const { increaseProductQuantity } = useCartStore()
  const t = useScopedI18n("aichat")

  return (
    <Button
      className={`w-full font-semibold hover:shadow-success/30 transition-shadow ${className}`}
      variant="success"
      size="lg"
      rounded="lg"
      shadow="sm"
      rightIcon={<BsCart3 className="text-lg" />}
      onClick={() => increaseProductQuantity(productId)}>
      {t("add_to_cart")}
    </Button>
  )
}
