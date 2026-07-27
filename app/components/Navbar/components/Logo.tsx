import Image from "next/image"
import Link from "next/link"

import useDarkModeStore from "@/store/ui/useDarkModeStore"

// http://localhost:6006/?path=/story/navigation-navbar--anonymous
export function Logo() {
  const darkMode = useDarkModeStore.getState().isDarkMode

  return (
    <Link href="/">
      <Image
        className="cursor-pointer hidden mobile:flex"
        src={darkMode ? "/joki-dark.png" : "/joki-light.png"}
        alt="logo"
        width={135}
        height={32}
        priority
      />
      <Image
        className="cursor-pointer flex mobile:hidden"
        src={darkMode ? "/logo-dark.png" : "/logo-light.png"}
        alt="logo"
        width={60}
        height={44}
        priority
      />
    </Link>
  )
}
