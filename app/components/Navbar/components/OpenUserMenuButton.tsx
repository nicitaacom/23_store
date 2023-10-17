"use client"
import { DropdownContainer, DropdownItem } from "@/components/ui"
import useUserStore from "@/store/user/userStore"
import Image from "next/image"
import { AiOutlinePlus } from "react-icons/ai"
import LogoutDropdownItem from "./LogoutDropdownItem"

export default function OpenUserMenuButton() {
  const userStore = useUserStore()

  return (
    <DropdownContainer
      classNameDropdownContainer="ml-1"
      className="max-w-[175px]"
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
      <LogoutDropdownItem />
    </DropdownContainer>
  )
}
