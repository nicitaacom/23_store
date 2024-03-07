import { BiSearchAlt } from "react-icons/bi"

import supabaseServer from "@/libs/supabase/supabaseServer"
import { Language } from "../Language"
import { SwitchDarkMode } from ".."
import { NavbarWrapper } from "./components/NavbarWrapper"
import { AvatarDropdown, HamburgerMenu, Logo, NavbarSearch, OpenAuthModalButton, CartIcon } from "./components"
import { CtrlKBadge } from "./components/CtrlKBadge"
import { ContactButton } from "./components/ContactButton"
import { getCookie } from "@/utils/helpersSSR"

export default async function Navbar() {
  const {
    data: { user },
  } = await supabaseServer().auth.getUser()

  let role = "USER"
  if (user && user.id) {
    const { data: role_response, error: role_error } = await supabaseServer()
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single()
    if (role_error) throw role_error
    role = role_response.role
  }

  // need to get avatarUrl on server and then pass to client component (because I import cookies from next/headers)
  const avatarUrl = getCookie("avatarUrl")

  return (
    <NavbarWrapper>
      <div className="flex flex-row gap-x-4 items-center">
        {/* HAMBURGER-ICON + LOGO */}
        <HamburgerMenu />
        <Logo />
      </div>
      {/* SEARCH + LANGUAGE */}
      <div className="flex flex-row gap-x-2">
        <NavbarSearch>
          <CtrlKBadge />
        </NavbarSearch>
        <Language className="hidden laptop:flex" />
      </div>

      {/* ICONS HELP */}
      <div className="flex flex-row gap-x-2 items-center ">
        <SwitchDarkMode className="max-[500px]:hidden" />
        <BiSearchAlt className="flex tablet:hidden" size={28} />
        <CartIcon />
        <ContactButton />
        {user ? <AvatarDropdown role={role} avatarUrlServer={avatarUrl} /> : <OpenAuthModalButton />}
      </div>
    </NavbarWrapper>
  )
}
