"use client"

import { useRef, useState } from "react"
import Link from "next/link"
import { FiPhoneCall } from "react-icons/fi"

import { DropdownContainer } from "@/components/ui"
import useEscOrClickOutside from "@/hooks/useOnEscOrClickOutside"

export function ContactButton() {
  const dropDownRef = useRef<HTMLDivElement>(null)
  const [isShowDropdown, setIsShowDropdown] = useState(false)

  function closeDropdown() {
    setIsShowDropdown(false)
  }
  function toggleDropdown() {
    setIsShowDropdown(!isShowDropdown)
  }

  useEscOrClickOutside(dropDownRef, closeDropdown)

  return (
    <DropdownContainer
      isDropdown={isShowDropdown}
      toggle={toggleDropdown}
      dropdownRef={dropDownRef}
      classNameDropdownContainer="hidden mobile:flex"
      className="before:translate-x-[-300%] translate-x-[35%] w-[125px]"
      icon={<FiPhoneCall size={28} />}>
      <div className="flex flex-col gap-y-2 justify-center items-center px-4 py-2">
        <div className="flex flex-col justify-center items-center">
          <Link
            className="hover:text-brand text-title text-center duration-300"
            href={process.env.NEXT_PUBLIC_TELEGRAM_URL}
            target="_blank"
            rel="preload">
            Telegram
          </Link>
          <p className="whitespace-nowrap">(response 8s)</p>
        </div>
      </div>
    </DropdownContainer>
  )
}
