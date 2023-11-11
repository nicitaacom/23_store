"use client"

import Link from "next/link"
import { FiPhoneCall } from "react-icons/fi"

import { contact } from "@/constant/contacts"
import { DropdownContainer } from "@/components/ui"
import useContactDropdownClose from "@/hooks/ui/useContactDropdownClose"

export function ContactButton() {
  const { isDropdown, openDropdown, closeDropdown, toggle, contactDropdownRef } = useContactDropdownClose()

  return (
    <DropdownContainer
      isDropdown={isDropdown}
      toggle={toggle}
      dropdownRef={contactDropdownRef}
      classNameDropdownContainer="hidden mobile:flex"
      className="before:translate-x-[-300%] translate-x-[35%] w-[125px]"
      icon={<FiPhoneCall size={28} />}>
      <div className="flex flex-col gap-y-2 justify-center items-center px-4 py-2">
        <div className="flex flex-col justify-center items-center">
          <Link
            className="hover:text-brand text-title text-center duration-300"
            href={contact.telegram}
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
