import { FiPhoneCall } from "react-icons/fi"
import { BiUserCircle } from "react-icons/bi"

import { Switch } from ".."
import { Language } from "../Language"
import { HamburgerMenu, Logo, NavbarSearch, OpenCartModalButton } from "./components"
import NavbarWrapper from "./components/NavbarWrapper"
import { DropdownContainer } from "../ui/DropdownContainer"
import Link from "next/link"

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
        <DropdownContainer
          className="before:translate-x-[-300%] translate-x-[35%] w-[125px]"
          icon={<FiPhoneCall size={28} />}>
          <div className="flex flex-col gap-y-2 justify-center items-center px-4 py-2">
            <div className="flex flex-col justify-center items-center">
              <Link className="hover:text-brand text-center" href="https://t.me/nicitaacom" target="_blank">
                Telegram
              </Link>
              <p className="whitespace-nowrap">(response 8s)</p>
            </div>
          </div>
        </DropdownContainer>

        <BiUserCircle className="cursor-pointer text-title hover:brightness-75 transition-all duration-300" size={32} />
      </div>
    </NavbarWrapper>
  )
}
