import Image from "next/image"

import useDarkMode from "@/store/ui/darkModeStore"
import { BackToMainButton } from "./components/BackToMainButton"

export function ExchangeCookiesError({ message }: { message?: string }) {
  const { isDarkMode } = useDarkMode()

  return (
    <div className="flex flex-col gap-y-4 items-center justify-center">
      <Image
        src={
          isDarkMode
            ? "/errors/user-not-found-after-exchanging-cookies-dark.jpg"
            : "/errors/user-not-found-after-exchanging-cookies-light.jpg"
        }
        alt="invalid-flow-state-found"
        width={1920}
        height={386}
      />
      <p className="text-danger">{message ? message : "No user found when exchanging cookies"}</p>
      <p>You might verified your email on new device or in incognito mode</p>
      <p>To get support contact us here - {process.env.NEXT_PUBLIC_SUPPORT_EMAIL}</p>
      <BackToMainButton />
    </div>
  )
}
