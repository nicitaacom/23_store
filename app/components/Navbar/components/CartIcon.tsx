"use client"

import useCartStore from "@/store/user/cartStore"
import Link from "next/link"
import { usePathname } from "next/navigation"

import { LuShoppingCart } from "react-icons/lu"

export function CartIcon() {
  const pathname = usePathname()
  const updatedPath = pathname + (pathname?.includes("?") ? "&" : "?") + "modal=" + "CartModal"
  const cartStore = useCartStore()

  const cartQuantity = cartStore.getCartQuantity()

  return (
    <Link
      className={`mr-1 cursor-pointer text-title transition-all duration-300
        before:absolute before:w-[20px] before:h-[20px] before:bg-brand before:rounded-full before:text-title-foreground
        before:translate-x-[80%] before:translate-y-[-20%] before:z-[9] ${
          cartQuantity === 0 ? "before:hidden" : "before:flex"
        }`}
      href={updatedPath}
      aria-label="cart">
      <LuShoppingCart className="cursor-pointer hover:brightness-75 duration-300" size={28} />
      <div
        className={`absolute min-w-[20px] translate-x-[80%] translate-y-[-175%] laptop:translate-y-[-155%]
          flex justify-center text-center text-title-foreground 
          text-[12px] laptop:text-[14px] z-[9] ${cartQuantity === 0 ? "hidden" : "flex"}`}>
        {cartQuantity}
      </div>
    </Link>
  )
}
