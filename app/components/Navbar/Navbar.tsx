import { BiSearchAlt } from "react-icons/bi"

import supabaseServer from "@/libs/supabaseServer"
import { Language } from "../Language"
import { SwitchDarkMode } from ".."
import { NavbarWrapper } from "./components/NavbarWrapper"
import {
  AvatarDropdown,
  HamburgerMenu,
  Logo,
  NavbarSearch,
  OpenAuthModalButton,
  OpenCartModalButton,
} from "./components"
import { CtrlKBadge } from "./components/CtrlKBadge"
import { ContactButton } from "./components/ContactButton"

export default async function Navbar() {
  const {
    data: { user },
  } = await supabaseServer().auth.getUser()

  const { data: role_response, error: role_error } = await supabaseServer()
    .from("users")
    .select("role")
    .eq("id", user?.id ?? "")
    .single()
  if (role_error) throw role_error

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
        <OpenCartModalButton />
        <ContactButton />
        {user ? <AvatarDropdown role={role_response.role} /> : <OpenAuthModalButton />}
      </div>
    </NavbarWrapper>
  )
}
