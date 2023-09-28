"use client"

import { usePathname } from "next/navigation"

import { BiUserCircle } from "react-icons/bi"
import Link from "next/link"

export default function OpenAuthModalButton() {
  const pathname = usePathname()
  const updatedPath = pathname + (pathname.includes("?") ? "&" : "?") + "modal=" + "AuthModal"

  return (
    <Link className="w-fit" href={updatedPath}>
      <BiUserCircle className="cursor-pointer text-title hover:brightness-75 transition-all duration-300" size={32} />
    </Link>
  )
}
