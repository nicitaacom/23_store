"use client"

import { MdOutlineDeleteOutline } from "react-icons/md"

import { Button } from ".."

export function ClearProductQuantityButton({ onClick }: { onClick: () => void }) {
  return (
    <Button className="font-secondary font-thin max-h-[50px]" variant="danger-outline" onClick={onClick}>
      Clear
      <MdOutlineDeleteOutline />
    </Button>
  )
}
