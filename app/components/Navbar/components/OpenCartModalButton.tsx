"use client"

import useCartStore from "@/store/user/cartStore"
import Link from "next/link"
import { usePathname } from "next/navigation"

import { LuShoppingCart } from "react-icons/lu"

export default function OpenCartModalButton() {
  const pathname = usePathname()
  const updatedPath = pathname + (pathname.includes("?") ? "&" : "?") + "modal=" + "CartModal"
  const cartStore = useCartStore()

  const cartQuantity = cartStore.getCartQuantity()

  return (
    <Link href={updatedPath} aria-label="cart">
      <LuShoppingCart className="cursor-pointer hover:brightness-75 duration-300" size={28} />
      {cartQuantity}
    </Link>
  )
}
