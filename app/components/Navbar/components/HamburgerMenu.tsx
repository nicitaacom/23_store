import { AiOutlineMenu } from "react-icons/ai"

import { useSidebar } from "@/store/ui/useSidebar"

export function HamburgerMenu() {
  // const sidebar = useSidebar()
  return <AiOutlineMenu className="flex cursor-pointer" size={28} />
}
