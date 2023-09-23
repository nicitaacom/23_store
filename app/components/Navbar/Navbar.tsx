"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"

import { BiSearchAlt, BiUserCircle, BiLogOut } from "react-icons/bi"
import { LuShoppingCart } from "react-icons/lu"
import { AiOutlineMenu, AiOutlinePlus } from "react-icons/ai"
import { FiPhoneCall } from "react-icons/fi"

import supabase from "@/utils/supabaseClient"
import useUserCartStore from "@/store/user/userCartStore"
import useDarkMode from "@/store/ui/darkModeStore"
import useUserStore from "@/store/user/userStore"
import { useModals } from "@/store/ui"
import { useSidebar } from "@/store/ui/useSidebar"
import { Input, Switch } from "../ui/Inputs"
import { Language } from "./Language"
import { Sidebar } from "./Sidebar"
import { DropdownContainer } from "./DropdownContainer"
import { DropdownItem } from "./DropdownItem"
import Image from "next/image"

export function Navbar() {
  const [scrollPosition, setScrollPosition] = useState(0)
  const [search, setSearch] = useState("")

  const router = useRouter()
  const { openModal } = useModals()
  const sidebar = useSidebar()
  const darkMode = useDarkMode()
  const userCartStore = useUserCartStore()
  const userStore = useUserStore()

  useEffect(() => {
    function handleScroll() {
      const position = window.scrollY
      setScrollPosition(position)
    }

    window.addEventListener("scroll", handleScroll)
    return () => {
      window.removeEventListener("scroll", handleScroll)
    }
  }, [])

  return (
    <nav
      className={`fixed flex flex-row justify-between items-center 
    px-4 tablet:px-6 laptop:px-8 py-2 max-h-[64px] mx-auto z-[99] text-title w-full transition-all duration-300
    ${scrollPosition < 40 ? "bg-background" : "bg-foreground"}`}>
      <div className="flex flex-row gap-x-4 items-center">
        {/* HAMBURGER-ICON */}
        <AiOutlineMenu className="flex cursor-pointer text-icon-color" onClick={sidebar.openSidebar} size={28} />

        {/* LOGO */}
        <Image
          className="cursor-pointer uppercase max-h-[32px] aspect-video"
          onClick={() => router.push("/")}
          width={175}
          height={355}
          src={darkMode ? "/23_store-dark.png" : "/23_store-light.png"}
          alt="navbar logo"
        />
      </div>

      <div className="flex flex-row gap-x-2">
        {/* SEARCH */}
        <Input
          className="hidden tablet:flex w-[40vw] max-w-[600px]"
          startIcon={<BiSearchAlt size={24} />}
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search..."
        />

        {/* LANGUAGE */}
        <Language className="hidden laptop:flex" />
      </div>

      {/* ICONS-HELP */}
      <div className="hidden mobile:flex flex-row gap-x-2 items-center ">
        <Switch isChecked={darkMode.isDarkMode} onChange={darkMode.toggleDarkMode} />

        <div
          className={`mr-1 cursor-pointer text-title hover:brightness-75 transition-all duration-300
        before:absolute before:w-[20px] before:h-[20px] before:bg-brand before:rounded-full before:text-title-foreground
        before:translate-x-[80%] before:translate-y-[-20%] ${
          userCartStore.cartQuantity === 0 ? "before:hidden" : "before:flex"
        }`}
          onClick={() => openModal("CartModal")}>
          <LuShoppingCart className="cursor-pointer" size={28} />
          <div
            className={`absolute min-w-[20px] translate-x-[80%] translate-y-[-175%] laptop:translate-y-[-155%]
          flex justify-center text-center text-title-foreground 
          text-[12px] laptop:text-[14px] ${userCartStore.cartQuantity === 0 ? "hidden" : "flex"}`}>
            {userCartStore.cartQuantity}
          </div>
        </div>

        <FiPhoneCall
          className="cursor-pointer text-icon-color hover:brightness-75 transition-all duration-300 mr-2"
          size={28}
        />

        {userStore.userId ? (
          <DropdownContainer
            username={userStore.username}
            icon={
              <Image
                className="w-[32px] h-[32px] rounded-full"
                width={32}
                height={32}
                src={userStore.profilePictureUrl ? userStore.profilePictureUrl : "/placeholder.jpg"}
                alt="placeholder"
              />
            }
            className="w-[175px]">
            <DropdownItem
              label="Add product"
              icon={AiOutlinePlus}
              onClick={() => openModal("AdminModal")}></DropdownItem>
            <DropdownItem
              label="logout"
              icon={BiLogOut}
              onClick={() => {
                supabase.auth.signOut(), userStore.logoutUser()
              }}></DropdownItem>
          </DropdownContainer>
        ) : (
          <BiUserCircle
            className="cursor-pointer text-title hover:brightness-75 transition-all duration-300"
            onClick={() => openModal("AuthModal")}
            size={32}
          />
        )}
      </div>

      <Sidebar />
    </nav>
  )
}
