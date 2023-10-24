import Link from "next/link"

import { FiPhoneCall } from "react-icons/fi"

import { SwitchDarkMode } from ".."
import { Language } from "../Language"
import {
  HamburgerMenu,
  Logo,
  NavbarSearch,
  OpenAuthModalButton,
  OpenCartModalButton,
  OpenUserMenuButton,
} from "./components"
import NavbarWrapper from "./components/NavbarWrapper"
import { DropdownContainer } from "../ui/DropdownContainer"
import supabaseServer from "@/utils/supabaseServer"
import { TbWorld } from "react-icons/tb"
import { BiSearchAlt } from "react-icons/bi"
import { contact } from "@/constant/contacts"

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
        <NavbarSearch />
        <Language className="hidden laptop:flex" />
      </div>

      {/* ICONS HELP */}
      <div className="flex flex-row gap-x-2 items-center ">
        <SwitchDarkMode className="max-[500px]:hidden" />
        <BiSearchAlt className="flex tablet:hidden" size={28} />
        <OpenCartModalButton />
        <DropdownContainer
          classNameDropdownContainer="hidden mobile:flex"
          className="before:translate-x-[-300%] translate-x-[35%] w-[125px]"
          icon={<FiPhoneCall size={28} />}>
          <div className="flex flex-col gap-y-2 justify-center items-center px-4 py-2">
            <div className="flex flex-col justify-center items-center">
              <Link
                className="hover:text-brand text-title text-center duration-300"
                href={contact.telegram}
                target="_blank"
                rel="preload">
                Telegram
              </Link>
              <p className="whitespace-nowrap">(response 8s)</p>
            </div>
          </div>
        </DropdownContainer>
        {user ? <OpenUserMenuButton /> : <OpenAuthModalButton />}
      </div>
    </NavbarWrapper>
  )
}
