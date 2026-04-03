import { useCallback, useEffect, useRef, useState } from "react"

export const useDragAndDrop = () => {
  const [isDragging, setIsDragging] = useState(false)
  const dragCounter = useRef(0)

  const handleDrop = useCallback(() => {
    dragCounter.current = 0
    setIsDragging(false)
  }, [])

  useEffect(() => {
    const hasFiles = (event: DragEvent) => Array.from(event.dataTransfer?.types ?? []).includes("Files")

    const handleDragEnter = (event: DragEvent) => {
      if (!hasFiles(event)) return

      event.preventDefault()
      dragCounter.current += 1
      setIsDragging(true)
    }

    const handleDragLeave = (event: DragEvent) => {
      if (!hasFiles(event)) return

      dragCounter.current -= 1

      if (dragCounter.current <= 0) {
        dragCounter.current = 0
        setIsDragging(false)
      }
    }

    const handleDragOver = (event: DragEvent) => {
      if (!hasFiles(event)) return
      event.preventDefault()
    }

    window.addEventListener("dragenter", handleDragEnter)
    window.addEventListener("dragleave", handleDragLeave)
    window.addEventListener("dragover", handleDragOver)
    window.addEventListener("drop", handleDrop)

    return () => {
      window.removeEventListener("dragenter", handleDragEnter)
      window.removeEventListener("dragleave", handleDragLeave)
      window.removeEventListener("dragover", handleDragOver)
      window.removeEventListener("drop", handleDrop)
    }
  }, [handleDrop])

  return { isDragging, handleDrop }
}
