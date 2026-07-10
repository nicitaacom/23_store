import { useEffect, useState } from "react"

export const useIsActiveTab = () => {
  const [isActiveTab, setIsActiveTab] = useState(() => typeof document !== "undefined" && document.visibilityState === "visible" && document.hasFocus())

  useEffect(() => {
    if (typeof document === "undefined") return

    const updateIsActiveState = (isActive: boolean) => {
      setIsActiveTab(prev => (prev === isActive ? prev : isActive))
    }

    const handleVisibilityChange = () => {
      updateIsActiveState(document.visibilityState === "visible" && document.hasFocus())
    }
    const handleFocus = () => updateIsActiveState(true)
    const handleBlur = () => updateIsActiveState(false)

    document.addEventListener("visibilitychange", handleVisibilityChange)
    window.addEventListener("focus", handleFocus)
    window.addEventListener("blur", handleBlur)

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange)
      window.removeEventListener("focus", handleFocus)
      window.removeEventListener("blur", handleBlur)
    }
  }, [])

  return { isActiveTab }
}
