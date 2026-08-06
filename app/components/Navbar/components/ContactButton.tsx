"use client"

import { useRef, useState } from "react"
import Link from "next/link"
import { FiPhoneCall } from "react-icons/fi"

import useEscOrClickOutside from "@/hooks/useOnEscOrClickOutside"
import { useScopedI18n } from "@/locales/client"
import { DropdownContainer } from "@/components/ui"

// http://localhost:6006/?path=/story/navigation-navbar--anonymous
export function ContactButton() {
  const t = useScopedI18n("common")
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
      className="before:translate-x-[-300%] translate-x-[35%] w-[125px]"
      isDropdown={isShowDropdown}
      toggle={toggleDropdown}
      dropdownRef={dropDownRef}
      classNameDropdownContainer="hidden mobile:flex"
      icon={
        <span data-cy="contact-trigger">
          <FiPhoneCall size={28} />
        </span>
      }>
      <div className="flex flex-col gap-y-2 justify-center items-center px-4 py-2">
        <div className="flex flex-col justify-center items-center">
          <Link
            className="hover:text-brand text-title text-center duration-300"
            href={process.env.NEXT_PUBLIC_TELEGRAM_URL}
            target="_blank"
            rel="preload">
            {/* Telegram is a brand name, not translated */}
            {"Telegram"}
          </Link>
          <p className="whitespace-nowrap">{t("contact_response_time")}</p>
        </div>
      </div>
    </DropdownContainer>
  )
}
