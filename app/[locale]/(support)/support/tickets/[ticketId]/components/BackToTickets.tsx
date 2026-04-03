"use client"

import { useRouter } from "next/navigation"
import { IoMdArrowRoundBack } from "react-icons/io"

import { Button } from "@/components/ui"
import { useScopedI18n } from "@/locales/client"

export function BackToTickets() {
  const router = useRouter()
  const t = useScopedI18n("support")

  return (
    <Button
      className="group mt-4 flex flex-row gap-x-2 self-center laptop:hidden"
      variant="default-outline"
      rounded="full"
      onClick={() => router.push("/support/tickets")}>
      <IoMdArrowRoundBack className="group-hover:-translate-x-0.5 duration-300" />
      {t("back_to_tickets")}
    </Button>
  )
}
