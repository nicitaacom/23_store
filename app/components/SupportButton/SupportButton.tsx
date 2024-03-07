"use client"

import { BiSupport } from "react-icons/bi"

import useSupportDropdownClose from "@/hooks/ui/useSupportDropdownClose"
import { Button, DropdownContainer } from "../ui"
import SupportButtonDropdown from "@/components/SupportButton/components/SupportButtonDropdown"

export default function SupportButton() {
  const { isDropdown, toggle, supportDropdownRef } = useSupportDropdownClose()

  //before:translate-y-[402px] should be +2px then <section className="h-[400px]
  //w-[400px] should be = section w-[400px]
  return (
    <DropdownContainer
      className="w-[280px] mobile:w-[375px] top-[-480px] mobile:top-[-570px] desktop:top-[-585px]
       translate-x-[-32.5px] desktop:translate-x-[-40px] before:translate-y-[402px] mobile:before:translate-y-[492px]
       before:border-l-0 before:border-t-0 before:border-r before:border-b before:bg-foreground-accent before:z-[2]"
      classNameIsDropdownTrue="translate-y-[-4px]"
      classNameIsDropdownFalse="translate-y-[5px]"
      isDropdown={isDropdown}
      toggle={toggle}
      dropdownRef={supportDropdownRef}
      icon={
        <Button
          className="w-[48px] h-[48px] px-3 desktop:px-4 desktop:w-[64px] desktop:h-[64px] fixed bottom-4 right-6 rounded-full border border-border-color"
          variant="default-outline">
          <BiSupport className="text-icon-color w-[32px] h-[32px] desktop:w-[32px] desktop:h-[32px]" />
        </Button>
      }>
      <SupportButtonDropdown />
    </DropdownContainer>
  )
}
