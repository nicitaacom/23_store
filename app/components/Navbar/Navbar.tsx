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
  const supabase = await supabaseServer()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const cart_products_response = user?.id
    ? await supabase.from("23_users_cart").select("cart_products").eq("id", user.id).maybeSingle()
    : null
  const cart_products = cart_products_response?.data?.cart_products as unknown as TRecordCartProduct

  let cart_quantity = 0

  if (cart_products)
    cart_quantity = Object.keys(cart_products).reduce((accum, current) => {
      const { quantity } = cart_products[current]
      accum += quantity
      return accum
    }, 0)

  let roles: string[] = []
  if (user && user.id) {
    const { data: role_rows, error: role_error } = await supabase
      .from("23_users")
      .select("roles")
      .eq("id", user.id)
      .order("created_at", { ascending: true })
    if (role_error) throw Error(role_error.message)
    roles = role_rows?.[0]?.roles ?? []
  }

  // need to get avatarUrl on server and then pass to client component (because I import cookies from next/headers)
  const avatarUrl = (await getCookie("avatarUrl")) || undefined

  return (
    <NavbarWrapper>
      <div className="flex flex-row gap-x-4 items-center">
        {/* HAMBURGER-ICON + LOGO */}
        <HamburgerMenu />
        <Logo />
      </div>
      {/* ICONS HELP */}
      <div className="flex flex-row gap-x-2 items-center ">
        {/* Tablet+ shows it inline; on mobile it lives at the bottom of the hamburger aside */}
        <LanguageDropdown className="hidden tablet:flex" />
        <SwitchDarkMode className="max-[500px]:hidden" />
        <BiSearchAlt className="flex tablet:hidden" size={28} />
        <CartIcon userId={user?.id} cart_quantity={cart_quantity} />
        <ContactButton />
        {user ? <AvatarDropdown roles={roles} avatarUrlServer={avatarUrl} /> : <OpenAuthModalButton />}
      </div>
    </NavbarWrapper>
  )
}
