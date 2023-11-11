"use client"

import { Button } from ".."

export function DecreaseProductQuantityButton({ onClick }: { onClick: () => void }) {
  return (
    <Button className="min-w-[50px] max-h-[50px] laptop:w-fit text-2xl" variant="danger-outline" onClick={onClick}>
      -
    </Button>
  )
}
