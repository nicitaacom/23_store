import { useEffect, useRef, useState } from "react"

export const useIsActiveTab = () => {
  const isActiveRef = useRef<boolean>(document.visibilityState === "visible" && document.hasFocus())
  const [trigger, setTrigger] = useState(false) // Used only to trigger re-renders

  // Function to update the isActive state
  const updateIsActiveState = (isActive: boolean) => {
    if (isActiveRef.current !== isActive) {
      isActiveRef.current = isActive
      setTrigger(prev => !prev) // Toggle the trigger to force a re-render
      console.log("Tab Active State Changed:", isActive) // Single console log for monitoring
    }
  }

  useEffect(() => {
    // Handlers that update the active state
    const handleVisibilityChange = () => {
      updateIsActiveState(document.visibilityState === "visible" && document.hasFocus())
    }
    const handleFocus = () => updateIsActiveState(true)
    const handleBlur = () => updateIsActiveState(false)

    // Register event listeners
    document.addEventListener("visibilitychange", handleVisibilityChange)
    window.addEventListener("focus", handleFocus)
    window.addEventListener("blur", handleBlur)

    // Initial check to update state based on the current tab status
    handleVisibilityChange()

    // Cleanup function to remove event listeners
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange)
      window.removeEventListener("focus", handleFocus)
      window.removeEventListener("blur", handleBlur)
    }
  }, [])

  return { isActiveTab: isActiveRef.current }
}
