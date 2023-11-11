"use client"

import { Button } from ".."

export function IncreaseProductQuantityButton({ onClick }: { onClick: () => void }) {
  return (
    <Button className="min-w-[50px] max-h-[50px] laptop:w-fit text-2xl" variant="success-outline" onClick={onClick}>
      +
    </Button>
  )
}
