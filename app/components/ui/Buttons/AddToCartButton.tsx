"use client"

import { Button } from ".."

export function AddToCartButton({ onClick }: { onClick: () => void }) {
  return (
    <Button
      className="min-w-[50px] max-h-[50px] h-[50px] laptop:w-fit text-xl font-medium"
      variant="success-outline"
      onClick={onClick}>
      Add to cart
    </Button>
  )
}
