"use client"

import { MdOutlineDeleteOutline } from "react-icons/md"

import { Button } from ".."

export default function ClearProductQuantityButton() {
  return (
    <Button className="font-secondary font-thin max-h-[50px]" variant="danger-outline" onClick={() => {}}>
      Clear <MdOutlineDeleteOutline />
    </Button>
  )
}
