"use client"

import { BiSupport } from "react-icons/bi"

import { Button } from "./ui"

export function SupportButton() {
  return (
    <Button
      className="w-[48px] h-[48px] desktop:w-[64px] desktop:h-[64px] fixed bottom-4 right-4 rounded-full border border-border-color"
      variant="outline">
      <BiSupport className="text-icon-color w-[24px] h-[24px] desktop:w-[32px] desktop:h-[32px]" />
    </Button>
  )
}
