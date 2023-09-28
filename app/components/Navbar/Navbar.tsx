import { FiPhoneCall } from "react-icons/fi"
import { BiUserCircle } from "react-icons/bi"

import { Switch } from ".."
import { Language } from "../Language"
import { HamburgerMenu, Logo, NavbarSearch, OpenCartModalButton } from "./components"
import NavbarWrapper from "./components/NavbarWrapper"

export default function Navbar() {
  return (
    <NavbarWrapper>
      <div className="flex flex-row gap-x-4 items-center">
        {/* HAMBURGER-ICON + LOGO */}
        <HamburgerMenu />
        <Logo />
      </div>
      {/* SEARCH + LANGUAGE */}
      <div className="flex flex-row gap-x-2">
        <NavbarSearch />
        <Language className="hidden laptop:flex" />
      </div>

      {/* ICONS HELP */}
      <div className="hidden mobile:flex flex-row gap-x-2 items-center ">
        <Switch />
        <OpenCartModalButton />
        <FiPhoneCall
          className="cursor-pointer text-icon-color hover:brightness-75 transition-all duration-300 mr-2"
          size={28}
        />
        <BiUserCircle className="cursor-pointer text-title hover:brightness-75 transition-all duration-300" size={32} />
      </div>
    </NavbarWrapper>
  )
}
