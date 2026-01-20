import Image from "next/image"

import useDarkModeStore from "@/store/ui/useDarkModeStore"
import Link from "next/link"

export function Logo() {
  const darkMode = useDarkModeStore.getState().isDarkMode

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
