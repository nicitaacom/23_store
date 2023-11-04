"use client"

import { AiOutlineMenu } from "react-icons/ai"

import { useSidebar } from "@/store/ui/useSidebar"

export function HamburgerMenu() {
  const sidebar = useSidebar()
  return <AiOutlineMenu className="flex cursor-pointer" onClick={sidebar.openSidebar} size={28} />
}
