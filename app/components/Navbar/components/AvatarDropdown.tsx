"use client"
import Image from "next/image"
import { useRouter } from "next/navigation"

import { BsWindow } from "react-icons/bs"
import { BiImageAdd } from "react-icons/bi"
import { IoChatboxEllipsesOutline } from "react-icons/io5"
import { IoIosStats } from "react-icons/io"
import { FaTelegramPlane } from "react-icons/fa"

import useUserStore from "@/store/user/userStore"
import { useUpdateAvatarModal } from "@/store/ui/useUpdateAvatarModal"
import useDarkModeStore from "@/store/ui/useDarkModeStore"
import { SwitchDarkMode } from "@/components"
import { DropdownContainer, DropdownItem } from "@/components/ui"
import { LogoutDropdownItem } from "./LogoutDropdownItem"
import useEscOrClickOutside from "@/hooks/useOnEscOrClickOutside"
import { useRef, useState } from "react"
import { getCookie } from "@/utils/helpersCSR"
import { getUserAvatarUrl, getUserName } from "@/utils/user"

interface AvatarDropdownProps {
  role: string
  avatarUrlServer: string | undefined
}

function getSafeAvatarUrl(avatarUrlClient: string, avatarUrlServer: string | undefined) {
  const avatarUrlFromCookie = getCookie("avatarUrl")?.trim() || ""
  const avatarUrl = avatarUrlFromCookie || avatarUrlServer?.trim() || avatarUrlClient || ""
  return avatarUrl || "/placeholder.jpg"
}

function getAnonymousAvatar(isDarkMode: boolean) {
  return isDarkMode ? "/BiUserCircle-dark.svg" : "/BiUserCircle-light.svg"
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

  const { user } = useUserStore()
  const updateAvatarModal = useUpdateAvatarModal()
  const { isDarkMode, toggleDarkMode } = useDarkModeStore()

  const avatarUrl = user ? getSafeAvatarUrl(getUserAvatarUrl(user), avatarUrlServer) : getAnonymousAvatar(isDarkMode)

  function openAdminPanel() {
    router.push("?modal=AdminPanel")
    closeDropdown()
  }

  function openSupportTickets() {
    router.push("/support/tickets")
    closeDropdown()
  }

  function openUpdateAvatarModal() {
    updateAvatarModal.openModal(getCookie("avatarUrl")?.trim() || avatarUrlServer?.trim() || getUserAvatarUrl(user))
    closeDropdown()
  }

  return (
    <DropdownContainer
      isDropdown={isShowDropdown}
      toggle={toggleDropdown}
      dropdownRef={avatarDropdownRef}
      classNameDropdownContainer="ml-1 z-[102]"
      className="max-w-[200px]"
      username={getUserName(user) || "anonymous"}
      icon={
        <Image className="w-[32px] h-[32px] rounded-full object-cover" src={avatarUrl} alt="user logo" width={64} height={64} />
      }>
      {role === "SUPPORT" && <DropdownItem label="Support chat" icon={IoChatboxEllipsesOutline} onClick={openSupportTickets} />}
      <DropdownItem label="Admin panel" icon={BsWindow} onClick={openAdminPanel} />
      <DropdownItem label="Update avatar" icon={BiImageAdd} onClick={openUpdateAvatarModal} />
      <DropdownItem
        className="flex justify-center mobile:hidden"
        label="Support"
        icon={FaTelegramPlane}
        href={process.env.NEXT_PUBLIC_TELEGRAM_URL}
        target="_blank"
      />
      {role === "SUPPORT" && <DropdownItem label="Stats" icon={IoIosStats} href="/stats" />}
      <DropdownItem className="min-[501px]:hidden" label="Dark mode" icon={SwitchDarkMode} onClick={toggleDarkMode} />
      <LogoutDropdownItem />
    </DropdownContainer>
  )
}
