"use client"
import { useRef, useState } from "react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { BsWindow, BsDatabaseDown } from "react-icons/bs"
import { BiImageAdd } from "react-icons/bi"
import { IoChatboxEllipsesOutline } from "react-icons/io5"
import { IoIosStats } from "react-icons/io"
import { FaTelegramPlane } from "react-icons/fa"

import { LogoutDropdownItem } from "./LogoutDropdownItem"
import { getCookie } from "@/utils/helpersCSR"
import { getUserAvatarUrl, getUserName } from "@/utils/user"
import useDarkModeStore from "@/store/ui/useDarkModeStore"
import useEscOrClickOutside from "@/hooks/useOnEscOrClickOutside"
import { useScopedI18n } from "@/locales/client"
import { useUpdateAvatarModal } from "@/store/ui/useUpdateAvatarModal"
import useUser from "@/store/user/useUser"
import { DropdownContainer, DropdownItem } from "@/components/ui"
import { SwitchDarkMode } from "@/components"

interface AvatarDropdownProps {
  roles: string[]
  avatarUrlServer: string | undefined
}

function getSafeAvatarUrl(clientAvatarUrl: string, avatarUrlClient: string, avatarUrlServer: string | undefined) {
  const avatarUrl = clientAvatarUrl || getCookie("avatarUrl")?.trim() || avatarUrlServer?.trim() || avatarUrlClient || ""
  return avatarUrl || "/placeholder.jpg"
}

function getAnonymousAvatar(isDarkMode: boolean) {
  return isDarkMode ? "/BiUserCircle-dark.svg" : "/BiUserCircle-light.svg"
}

// http://localhost:6006/?path=/story/navigation-navbar--anonymous
export function AvatarDropdown({ roles, avatarUrlServer }: AvatarDropdownProps) {
  const router = useRouter()
  const t = useScopedI18n("backup")
  const tCommon = useScopedI18n("common")

  const avatarDropdownRef = useRef<HTMLDivElement>(null)
  const [isShowDropdown, setIsShowDropdown] = useState(false)

  function closeDropdown() {
    setIsShowDropdown(false)
  }
  function toggleDropdown() {
    setIsShowDropdown(!isShowDropdown)
  }

  useEscOrClickOutside(avatarDropdownRef, closeDropdown)

  const { user, clientAvatarUrl } = useUser()
  const updateAvatarModal = useUpdateAvatarModal()
  const { isDarkMode, toggleDarkMode } = useDarkModeStore()

  const avatarUrl = user
    ? getSafeAvatarUrl(clientAvatarUrl, getUserAvatarUrl(user), avatarUrlServer)
    : getAnonymousAvatar(isDarkMode)

  function openAdminPanel() {
    router.push("?modal=AdminPanel")
    closeDropdown()
  }

  function openDbBackup() {
    router.push("?modal=DbBackup")
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
      className="max-w-[200px]"
      list
      isDropdown={isShowDropdown}
      toggle={toggleDropdown}
      dropdownRef={avatarDropdownRef}
      classNameDropdownContainer="ml-1 z-[102]"
      username={getUserName(user) || "anonymous"}
      icon={
        <span data-cy="user-menu">
          <Image className="w-[32px] h-[32px] rounded-full object-cover" src={avatarUrl} alt={tCommon("user_avatar_alt")} width={64} height={64} />
        </span>
      }>
      {roles.includes("SUPPORT") && (
        <DropdownItem label="Support chat" icon={IoChatboxEllipsesOutline} onClick={openSupportTickets} />
      )}
      <DropdownItem label="Manage products" icon={BsWindow} onClick={openAdminPanel} />
      {roles.includes("ADMIN") && <DropdownItem label={t("dropdown_item")} icon={BsDatabaseDown} onClick={openDbBackup} />}
      <DropdownItem label="Update avatar" icon={BiImageAdd} onClick={openUpdateAvatarModal} />
      <DropdownItem
        className="flex justify-center mobile:hidden"
        label="Support"
        icon={FaTelegramPlane}
        href={process.env.NEXT_PUBLIC_TELEGRAM_URL}
        target="_blank"
      />
      {roles.includes("ADMIN") && <DropdownItem label="Stats" icon={IoIosStats} href="/stats" />}
      <DropdownItem className="min-[501px]:hidden" label="Dark mode" icon={SwitchDarkMode} onClick={toggleDarkMode} />
      <LogoutDropdownItem />
    </DropdownContainer>
  )
}
