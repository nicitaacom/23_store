"use client"

import { useRouter } from "next/navigation"
import { IoMdArrowRoundBack } from "react-icons/io"

import { Button } from "@/components/ui"

export function BackToTickets() {
  const router = useRouter()

  return (
    <Button
      className="flex laptop:hidden flex-row gap-x-2 group"
      variant="default-outline"
      onClick={() => router.push("/support/tickets")}>
      <IoMdArrowRoundBack className="group-hover:-translate-x-0.5 duration-300" />
      Back to tickets
    </Button>
  )
}
