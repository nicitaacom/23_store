import { isDarkMode } from "@/functions/isDarkMode"
import Image from "next/image"

import Link from "next/link"

export function Logo() {
  return (
    <Link href="/">
      <Image
        className="cursor-pointer hidden mobile:flex"
        src={isDarkMode() ? "/23_store-dark.png" : "/23_store-light.png"}
        alt="logo"
        width={135}
        height={32}
        priority
      />
      <Image
        className="cursor-pointer flex mobile:hidden"
        src={isDarkMode() ? "/logo-dark.png" : "/logo-light.png"}
        alt="logo"
        width={60}
        height={44}
        priority
      />
    </Link>
  )
}
