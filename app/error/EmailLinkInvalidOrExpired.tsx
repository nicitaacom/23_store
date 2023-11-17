import Image from "next/image"

import useDarkMode from "@/store/ui/darkModeStore"
import { BackToMainButton } from "./components/BackToMainButton"

export function EmailLinkInvalidOrExpired() {
  const { isDarkMode } = useDarkMode()

  return (
    <div className="flex flex-col gap-y-4 items-center justify-center">
      <Image
        src={
          isDarkMode
            ? "/errors/email-link-invalid-or-has-expired-dark.jpg"
            : "/errors/email-link-invalid-or-has-expired-light.jpg"
        }
        alt="invalid-flow-state-found"
        width={1920}
        height={386}
      />
      <p className="text-danger">Email link is invalid or has expired</p>
      <p>Try again and use link that you become ASAP</p>
      <p>Also don&apos;t use link that you already used</p>
      <BackToMainButton />
    </div>
  )
}
