import Image from "next/image"

import useDarkMode from "@/store/ui/darkModeStore"
import Link from "next/link"

export function Logo() {
  const darkMode = useDarkMode.getState().isDarkMode

  return (
    <Link href="/">
      <Image
        className="cursor-pointer hidden mobile:flex"
        src={darkMode ? "/23_store-dark.png" : "/23_store-light.png"}
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
