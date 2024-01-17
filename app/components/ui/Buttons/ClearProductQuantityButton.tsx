"use client"

import { MdOutlineDeleteOutline } from "react-icons/md"
import { Button } from ".."

export function ClearProductQuantityButton({ onClick }: { onClick: () => void }) {
  return (
    <Button
      className="min-w-[50px] max-h-[50px] h-[50px] laptop:w-fit font-secondary text-xl font-thin"
      variant="danger-outline"
      onClick={onClick}>
      Clear
      <MdOutlineDeleteOutline />
    </Button>
  )
}
