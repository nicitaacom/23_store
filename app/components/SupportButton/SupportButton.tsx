"use client"

import { useRef, useState } from "react"
import { BiSupport } from "react-icons/bi"

import { Button, DropdownContainer } from "../ui"
import SupportButtonDropdown from "@/components/SupportButton/components/SupportButtonDropdown"
import { DragAndDropArea } from "./components/DragAndDropArea/DragAndDropArea"
import useEscOrClickOutside from "@/hooks/useOnEscOrClickOutside"

// export feault in order to lazy import this
export default function SupportButton() {
  const dropDownRef = useRef<HTMLDivElement>(null)
  const [isShowDropdown, setIsShowDropdown] = useState(false)

  function closeDropdown() {
    setIsShowDropdown(false)
  }
  function toggleDropdown() {
    setIsShowDropdown(!isShowDropdown)
  }

  useEscOrClickOutside(dropDownRef, closeDropdown)

  //before:translate-y-[402px] should be +2px then <section className="h-[400px]
  //w-[400px] should be = section w-[400px]
  return (
    <DropdownContainer
      classNameDropdownContainer="fixed bottom-4 right-6 z-[120]"
      className="w-[280px] mobile:w-[375px] top-[-480px] mobile:top-[-570px] desktop:top-[-585px]
       translate-x-[-32.5px] desktop:translate-x-[-40px] before:translate-y-[402px] mobile:before:translate-y-[492px]
       before:border-l-0 before:border-t-0 before:border-r before:border-b before:bg-foreground-accent before:z-[2]"
      classNameIsDropdownTrue="translate-y-[-4px]"
      classNameIsDropdownFalse="translate-y-[5px]"
      isDropdown={isShowDropdown}
      toggle={toggleDropdown}
      dropdownRef={dropDownRef}
      icon={
        <Button
          className="h-[48px] w-[48px] rounded-full border border-border-color bg-background/95 px-3 shadow-lg shadow-black/30
          backdrop-blur-sm desktop:h-[64px] desktop:w-[64px] desktop:px-4"
          variant="default-outline">
          <BiSupport className="text-icon-color w-[32px] h-[32px] desktop:w-[32px] desktop:h-[32px]" />
        </Button>
      }>
      <SupportButtonDropdown />
      <DragAndDropArea />
    </DropdownContainer>
  )
}
