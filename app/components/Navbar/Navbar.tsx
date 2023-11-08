import { BiSearchAlt } from "react-icons/bi"

import supabaseServer from "@/libs/supabaseServer"
import { Language } from "../Language"
import { SwitchDarkMode } from ".."
import { NavbarWrapper } from "./components/NavbarWrapper"
import {
  HamburgerMenu,
  Logo,
  NavbarSearch,
  OpenAuthModalButton,
  OpenCartModalButton,
  OpenUserMenuButton,
} from "./components"
import { CtrlKBadge } from "./components/CtrlKBadge"
import { SupportButton } from "./components/SupportButton"

export default async function Navbar() {
  const {
    data: { user },
  } = await supabaseServer().auth.getUser()

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
        <SupportButton />
        {user ? <OpenUserMenuButton /> : <OpenAuthModalButton />}
      </div>
    </NavbarWrapper>
  )
}
