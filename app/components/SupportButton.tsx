"use client"

import { BiSupport } from "react-icons/bi"

import { Button, DropdownContainer } from "./ui"
import useSupportDropdownClose from "@/hooks/ui/useSupportDropdownClose"

export function SupportButton() {
  const { isDropdown, openDropdown, closeDropdown, toggle, supportDropdownRef } = useSupportDropdownClose()

  //before:translate-y-[402px] should be +2px then <div className="h-[400px]

  return (
    <DropdownContainer
      className="w-[250px] top-[-495px] translate-x-[-30px] before:translate-y-[402px]
       before:border-l-0 before:border-t-0 before:border-r before:border-b"
      classNameIsDropdownTrue="translate-y-[-4px]"
      classNameIsDropdownFalse="translate-y-[5px]"
      isDropdown={isDropdown}
      toggle={toggle}
      dropdownRef={supportDropdownRef}
      icon={
        <Button
          className="w-[48px] h-[48px] desktop:w-[64px] desktop:h-[64px] fixed bottom-4 right-4 rounded-full border border-border-color"
          variant="outline">
          <BiSupport className="text-icon-color w-[24px] h-[24px] desktop:w-[32px] desktop:h-[32px]" />
        </Button>
      }>
      <div className="h-[400px] w-[250px]">
        <h1>Hi chat</h1>
      </div>
    </DropdownContainer>
  )
}
