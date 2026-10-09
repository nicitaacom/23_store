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

  const cartQuantity = hasMounted ? cartStore.getCartQuantity() : userId ? (cart_quantity ?? 0) : cartStore.getCartQuantity()

  // If SSR finished show cartQuantity otherwise if user isAuthenticated show fetched cart_quantity otherwise from localstorage
  return (
    <Link
      className="relative mr-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-md text-title transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/70"
      data-cy="open-cart"
      href={updatedPath}
      aria-label={t("cart")}>
      <LuShoppingCart className="cursor-pointer hover:brightness-75 duration-300" size={28} />
      {cartQuantity > 0 && (
        <div
          className="absolute right-0 top-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-brand px-1 text-center text-xs font-semibold leading-none text-title-foreground"
          data-cy="cart-quantity">
          {/* If !isAuthenticated - show state from localstorage */}
          {cartQuantity}
        </div>
      )}
    </Link>
  )
}
