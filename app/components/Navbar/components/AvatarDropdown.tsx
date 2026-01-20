"use client"

import Image from "next/image"
import { useRouter } from "next/navigation"

import { BsWindow } from "react-icons/bs"
import { TbWorld } from "react-icons/tb"
import { IoChatboxEllipsesOutline } from "react-icons/io5"
import { IoIosStats } from "react-icons/io"
import { FaTelegramPlane } from "react-icons/fa"

import useUserStore from "@/store/user/userStore"
import useDarkModeStore from "@/store/ui/useDarkModeStore"
import { SwitchDarkMode } from "@/components"
import { DropdownContainer, DropdownItem } from "@/components/ui"
import { LogoutDropdownItem } from "./LogoutDropdownItem"
import useEscOrClickOutside from "@/hooks/useOnEscOrClickOutside"
import { useRef, useState } from "react"

interface AvatarDropdownProps {
  role: string
  avatarUrlServer: string | undefined
}

export function AvatarDropdown({ role, avatarUrlServer }: AvatarDropdownProps) {
  const router = useRouter()

  const avatarDropdownRef = useRef<HTMLDivElement>(null)
  const [isShowDropdown, setIsShowDropdown] = useState(false)

  function closeDropdown() {
    setIsShowDropdown(false)
  }
  function toggleDropdown() {
    setIsShowDropdown(!isShowDropdown)
  }

  useEscOrClickOutside(avatarDropdownRef, closeDropdown)

  const userStore = useUserStore()
  const mode = useDarkModeStore()

  let avatarUrl = avatarUrlServer ?? userStore.avatarUrl ?? "/placeholder.jpg"

  function openAdminPanel() {
    router.push("?modal=AdminPanel")
    closeDropdown()
  }

  function openChangeLanguageModal() {
    router.push("?modal=ChangeLanguage")
    closeDropdown()
  }

  function openSupportTickets() {
    router.push("/support/tickets")
    closeDropdown()
  }

  return (
    <DropdownContainer
      isDropdown={isShowDropdown}
      toggle={toggleDropdown}
      dropdownRef={avatarDropdownRef}
      classNameDropdownContainer="ml-1 z-[102]"
      className="max-w-[200px]"
      username={userStore.username || "anonymous"}
      icon={<Image className="w-[32px] h-[32px] rounded-full" src={avatarUrl} alt="user logo" width={32} height={32} />}>
      {role === "SUPPORT" && <DropdownItem label="Support chat" icon={IoChatboxEllipsesOutline} onClick={openSupportTickets} />}
      <DropdownItem label="Admin panel" icon={BsWindow} onClick={openAdminPanel} />
      <DropdownItem
        className="flex justify-center mobile:hidden"
        label="Support"
        icon={FaTelegramPlane}
        href={process.env.NEXT_PUBLIC_TELEGRAM_URL}
        target="_blank"
      />
      {role === "SUPPORT" && <DropdownItem label="Stats" icon={IoIosStats} href="/stats" />}
      <DropdownItem className="whitespace-nowrap" label="Change language" icon={TbWorld} onClick={openChangeLanguageModal} />
      <DropdownItem className="min-[501px]:hidden" label="Dark mode" icon={SwitchDarkMode} onClick={mode.toggleDarkMode} />
      <LogoutDropdownItem />
    </DropdownContainer>
  )
}
