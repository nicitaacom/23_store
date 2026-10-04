"use client"

import { usePathname } from "next/navigation"
import Link from "next/link"
import { BiUserCircle } from "react-icons/bi"

import { useScopedI18n } from "@/locales/client"

// http://localhost:6006/?path=/story/authentication-authexample--sign-in
export function OpenAuthModalButton() {
  const t = useScopedI18n("auth")
  const pathname = usePathname()
  const updatedPath = pathname + (pathname?.includes("?") ? "&" : "?") + "modal=" + "AuthModal&variant=login"

  return (
    <Link
      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/70"
      href={updatedPath}
      aria-label={t("login")}>
      <BiUserCircle className="cursor-pointer text-title hover:brightness-75 transition-all duration-300" size={32} />
    </Link>
  )
}
