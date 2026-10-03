import { useEffect, useState } from "react"

const useDragging = () => {
  const [isDraggingg, setIsDragging] = useState(false)

  useEffect(() => {
    let hideTimer: ReturnType<typeof setTimeout> | null = null

    const handleDragOver = (event: DragEvent) => {
      if (!Array.from(event.dataTransfer?.types ?? []).includes("Files")) return
      setIsDragging(true)
      if (hideTimer) clearTimeout(hideTimer)
      // Dragend is not always fired when a file leaves the browser window.
      hideTimer = setTimeout(() => setIsDragging(false), 500)
    }

    const resetDrag = () => {
      if (hideTimer) clearTimeout(hideTimer)
      hideTimer = null
      setIsDragging(false)
    }

    document.addEventListener("dragover", handleDragOver, true)
    document.addEventListener("drop", resetDrag, true)
    document.addEventListener("dragend", resetDrag, true)

    return () => {
      if (hideTimer) clearTimeout(hideTimer)
      document.removeEventListener("dragover", handleDragOver, true)
      document.removeEventListener("drop", resetDrag, true)
      document.removeEventListener("dragend", resetDrag, true)
    }
  }, [])

  return { isDraggingg }
}

export default useDragging
