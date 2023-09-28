"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

import { LuShoppingCart } from "react-icons/lu"

export default function OpenCartModalButton() {
  const pathname = usePathname()
  const updatedPath = pathname + (pathname.includes("?") ? "&" : "?") + "modal=" + "CartModal"

  return (
    <Link href={updatedPath}>
      <LuShoppingCart className="cursor-pointer" size={28} />
    </Link>
  )
}
