"use client"
import { HiOutlineRefresh } from "react-icons/hi"
import { Button } from ".."

export default function RequestReplanishmentButton() {
  return (
    <Button className="text-lg flex flex-row gap-x-2" variant="info-outline" onClick={() => {}}>
      Request replenishment
      <HiOutlineRefresh />
    </Button>
  )
}
