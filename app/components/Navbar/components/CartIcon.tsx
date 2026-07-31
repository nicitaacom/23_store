"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { LuShoppingCart } from "react-icons/lu"

import useCartStore from "@/store/user/cartStore"
import { useHasMounted } from "@/hooks/useHasMounted"
import { useScopedI18n } from "@/locales/client"

interface CartIconProps {
  cart_quantity: number | undefined
  userId: string | undefined | null
}

// http://localhost:6006/?path=/story/navigation-navbar--anonymous
export function CartIcon({ cart_quantity, userId }: CartIconProps) {
  const t = useScopedI18n("common")
  const pathname = usePathname()
  const updatedPath = pathname + (pathname?.includes("?") ? "&" : "?") + "modal=" + "CartModal"
  const cartStore = useCartStore()
  const hasMounted = useHasMounted()

  const cartQuantity = cartStore.getCartQuantity()

  // If SSR finished show cartQuantity otherwise if user isAuthenticated show fetched cart_quantity otherwise from localstorage
  return (
    <Link
      className={`mr-1 cursor-pointer text-title transition-all duration-300
        before:absolute before:w-[20px] before:h-[20px] before:bg-brand before:rounded-full before:text-title-foreground
        before:translate-x-[80%] before:translate-y-[-20%] before:z-[9] ${
          (hasMounted ? cartQuantity : userId ? cart_quantity : cartQuantity) === 0 ? "before:hidden" : "before:flex"
        }`}
      data-cy="open-cart"
      href={updatedPath}
      aria-label={t("cart")}>
      <LuShoppingCart className="cursor-pointer hover:brightness-75 duration-300" size={28} />
      <div
        className={`absolute min-w-[20px] translate-x-[80%] translate-y-[-175%] laptop:translate-y-[-155%]
          flex justify-center text-center text-title-foreground 
          text-[12px] laptop:text-[14px] z-[9] ${(hasMounted ? cartQuantity : userId ? cart_quantity : cartQuantity) === 0 ? "hidden" : "flex"}`}
        data-cy="cart-quantity">
        {/* If !isAuthenticated - show state from localstorage */}
        {hasMounted ? cartQuantity : userId ? cart_quantity : cartQuantity}
      </div>
    </Link>
  )
}
