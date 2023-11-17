import Image from "next/image"
import { BackToMainButton } from "./components/BackToMainButton"
import useDarkMode from "@/store/ui/darkModeStore"

export function AuthNotCompleted() {
  const { isDarkMode } = useDarkMode()

  return (
    <div className="flex flex-col gap-y-4 items-center justify-center">
      <Image
        className="w-full"
        src={isDarkMode ? "/errors/invalid-flow-state-found-dark.jpg" : "/errors/invalid-flow-state-found-light.jpg"}
        alt="invalid-flow-state-found"
        width={1920}
        height={386}
      />
      <p className="text-danger">You auth flow not completed</p>
      <p>You got this error because you entered url in searchbar that needs to success message if auth completed</p>
      <p>Now close this page</p>
      <BackToMainButton />
    </div>
  )
}
