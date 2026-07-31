import Image from "next/image"
import Link from "next/link"

import useDarkModeStore from "@/store/ui/useDarkModeStore"
import { useScopedI18n } from "@/locales/client"

// http://localhost:6006/?path=/story/navigation-navbar--anonymous
export function Logo() {
  const t = useScopedI18n("common")
  const darkMode = useDarkModeStore.getState().isDarkMode

  return (
    <Link href="/">
      <Image
        className="cursor-pointer hidden mobile:flex"
        src={darkMode ? "/joki-dark.png" : "/joki-light.png"}
        alt={t("logo_alt")}
        width={135}
        height={32}
        priority
      />
      <Image
        className="cursor-pointer flex mobile:hidden"
        src={darkMode ? "/logo-dark.png" : "/logo-light.png"}
        alt={t("logo_alt")}
        width={60}
        height={44}
        priority
      />
    </Link>
  )
}
