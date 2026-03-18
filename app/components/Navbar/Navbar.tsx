import { BiSearchAlt } from "react-icons/bi"

import supabaseServer from "@/libs/supabase/supabaseServer"
import { LanguageDropdown } from "../LanguageDropdown"
import { SwitchDarkMode } from ".."
import { NavbarWrapper } from "./components/NavbarWrapper"
import { AvatarDropdown, HamburgerMenu, Logo, OpenAuthModalButton, CartIcon } from "./components"
import { ContactButton } from "./components/ContactButton"
import { getCookie } from "@/utils/helpersSSR"
import { TRecordCartProduct } from "@/ts/product/TRecordCartProduct"

export default async function Navbar() {
  const {
    data: { user },
  } = await supabaseServer().auth.getUser()

  const cart_products_response = await supabaseServer().from("users_cart").select("cart_products").single()
  const cart_products = cart_products_response.data?.cart_products as unknown as TRecordCartProduct

  let cart_quantity = 0

  if (cart_products)
    cart_quantity = Object.keys(cart_products).reduce((accum, current) => {
      const { quantity } = cart_products[current]
      accum += quantity
      return accum
    }, 0)

  let role = "USER"
  if (user && user.id) {
    const { data: role_response, error: role_error } = await supabaseServer()
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single()
    if (role_error) throw Error(role_error.message)
    role = role_response.role
  }

  // need to get avatarUrl on server and then pass to client component (because I import cookies from next/headers)
  const avatarUrl = getCookie("avatarUrl") || undefined

  return (
    <NavbarWrapper>
      <div className="flex flex-row gap-x-4 items-center">
        {/* HAMBURGER-ICON + LOGO */}
        <HamburgerMenu />
        <Logo />
      </div>
      {/* LANGUAGE */}
      <div className="flex flex-row gap-x-2">
        <LanguageDropdown className="hidden laptop:flex" />
      </div>

      {/* ICONS HELP */}
      <div className="flex flex-row gap-x-2 items-center ">
        <SwitchDarkMode className="max-[500px]:hidden" />
        <BiSearchAlt className="flex tablet:hidden" size={28} />
        <CartIcon userId={user?.id} cart_quantity={cart_quantity} />
        <ContactButton />
        {user ? <AvatarDropdown role={role} avatarUrlServer={avatarUrl} /> : <OpenAuthModalButton />}
      </div>
    </NavbarWrapper>
  )
}
