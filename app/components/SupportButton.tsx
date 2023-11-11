"use client"

import { BiSupport } from "react-icons/bi"

import { Button, DropdownContainer } from "./ui"
import useSupportDropdownClose from "@/hooks/ui/useSupportDropdownClose"

export function SupportButton() {
  const { isDropdown, openDropdown, closeDropdown, toggle, supportDropdownRef } = useSupportDropdownClose()

  //before:translate-y-[402px] should be +2px then <section className="h-[400px]
  //w-[400px] should be = section w-[400px]
  return (
    <DropdownContainer
      className="w-[400px] top-[-585px] translate-x-[-30px] before:translate-y-[492px]
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
      <section className="h-[490px] w-[400px]">
        <h1 className="text-center py-4 text-[1.4rem] font-semibold">Response ~15s</h1>
      </section>
    </DropdownContainer>
  )
}
