"use client"
import { DropdownContainer, DropdownItem } from "@/components/ui"
import useUserStore from "@/store/user/userStore"
import Image from "next/image"
import { AiOutlinePlus } from "react-icons/ai"
import LogoutDropdownItem from "./LogoutDropdownItem"
import { TbWorld } from "react-icons/tb"
import { FiPhoneCall } from "react-icons/fi"
import { SwitchDarkMode } from "@/components"
import useDarkMode from "@/store/ui/darkModeStore"
import { contact } from "@/constant/contacts"

export default function OpenUserMenuButton() {
  const userStore = useUserStore()
  const mode = useDarkMode()

  return (
    <DropdownContainer
      classNameDropdownContainer="ml-1"
      className="max-w-[200px]"
      username={userStore.username}
      icon={
        <>
          <Image
            className="w-[32px] h-[32px] rounded-full"
            src={userStore.profilePictureUrl ? userStore.profilePictureUrl : "/placeholder.jpg"}
            alt="user logo"
            width={32}
            height={32}
          />
        </>
      }>
      <DropdownItem label="Add product" icon={AiOutlinePlus} href="?modal=AddProduct" />
      <DropdownItem
        className="flex justify-center mobile:hidden"
        label="Support"
        icon={FiPhoneCall}
        href={contact.telegram}
        target="_blank"
      />
      <DropdownItem label="Change language" icon={TbWorld} href="?modal=ChangeLanguage" />
      <DropdownItem
        className="min-[501px]:hidden"
        label="Dark mode"
        icon={SwitchDarkMode}
        onClick={mode.toggleDarkMode}
      />
      <LogoutDropdownItem />
    </DropdownContainer>
  )
}
