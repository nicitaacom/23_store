"use client"

import { usePathname } from "next/navigation"

import { BiUserCircle } from "react-icons/bi"
import Link from "next/link"

export function OpenAuthModalButton() {
  const pathname = usePathname()
  const updatedPath = pathname + (pathname?.includes("?") ? "&" : "?") + "modal=" + "AuthModal&variant=login"

  return (
    <Link className="w-fit" href={updatedPath} aria-label="login">
      <BiUserCircle className="cursor-pointer text-title hover:brightness-75 transition-all duration-300" size={32} />
    </Link>
  )
}
