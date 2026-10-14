import Image from "next/image"

import { BackToMainButton } from "./components/BackToMainButton"
import useDarkModeStore from "@/store/ui/useDarkModeStore"

// http://localhost:6006/?path=/story/authentication-authpieces--headers-per-variant
export function EmailLinkInvalidOrExpired() {
  const { isDarkMode } = useDarkModeStore()

  return (
    <div className="flex flex-col gap-y-4 items-center justify-center">
      <div
        className={`w-full h-[35vh] relative ${isDarkMode ? "bg-[#0a6624]" : "bg-[#20e959]"} flex justify-center items-center`}>
        <Image
          className="w-[100px] laptop:w-[125px] desktop:w-[150px]"
          src={
            isDarkMode
              ? "/errors/email-link-invalid-or-has-expired-icon-dark.png"
              : "/errors/email-link-invalid-or-has-expired-icon-light.png"
          }
          alt="invalid-flow-state-found"
          width={1920}
          height={386}
        />
      </div>
      <p className="text-danger">Email link is invalid or has expired. Request a fresh link and open it within a few minutes.</p>
      <p className="text-center">Do not reuse a link that you have already opened</p>
      <p className="text-center">Also don&apos;t use link that you already used</p>
      <BackToMainButton />
    </div>
  )
}
