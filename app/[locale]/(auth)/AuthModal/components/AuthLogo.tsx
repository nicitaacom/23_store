import Image from "next/image"
import { twMerge } from "tailwind-merge"

import useDarkModeStore from "@/store/ui/useDarkModeStore"
import { useScopedI18n } from "@/locales/client"

interface AuthLogoProps {
  isAuthCompleted: boolean
  isRecoverCompleted: boolean
}

// http://localhost:6006/?path=/story/authentication-authpieces--headers-per-variant
export function AuthLogo({ isAuthCompleted, isRecoverCompleted }: AuthLogoProps) {
  const t = useScopedI18n("common")
  const darkMode = useDarkModeStore()
  return (
    <Image
      className={twMerge(`${isAuthCompleted || isRecoverCompleted ? "w-[48px] h-[48px]" : "w-[57px] h-[40px]"}`)}
      src={
        isAuthCompleted
          ? darkMode.isDarkMode
            ? "/authentication-completed-dark.png"
            : "/authentication-completed-light.png"
          : isRecoverCompleted
            ? darkMode.isDarkMode
              ? "/recover-completed-dark.png"
              : "/recover-completed-light.png"
            : darkMode.isDarkMode
              ? "/logo-dark.png"
              : "/logo-light.png"
      }
      alt={t("logo_alt")}
      width={64}
      height={64}
    />
  )
}
