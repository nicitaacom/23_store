import { useSupportDropdown } from "@/store/ui/useSupportDropdown"
import { RefObject, useEffect, useState, useRef } from "react"

export const useDragAndDrop = (ref: RefObject<HTMLElement | null>) => {
  const [isDragging, setIsDragging] = useState(false)
  const dragCounter = useRef(0)
  const { imageFiles } = useSupportDropdown()

  const handleDrop = () => {
    dragCounter.current--
    if (dragCounter.current <= 0) {
      setIsDragging(false)
    }
  }

  useEffect(() => {
    const node = ref.current
    if (!node) return

    const handleDragEnter = (e: DragEvent) => {
      if (!node.contains(e.target as Node)) return
      dragCounter.current++
      setIsDragging(true)
    }

    const handleDragLeave = (e: DragEvent) => {
      if (!node.contains(e.target as Node)) return
      dragCounter.current--
      if (dragCounter.current <= 0) {
        setIsDragging(false)
      }
    }

    const handleDragEnd = () => {
      dragCounter.current = 0
      setIsDragging(false)
    }

    node.addEventListener("dragenter", handleDragEnter)
    node.addEventListener("dragleave", handleDragLeave)
    // node.addEventListener("drop", handleDrop)
    node.addEventListener("dragend", handleDragEnd)

    return () => {
      node.removeEventListener("dragenter", handleDragEnter)
      node.removeEventListener("dragleave", handleDragLeave)
      // node.removeEventListener("drop", handleDrop)
      node.removeEventListener("dragend", handleDragEnd)
    }
  }, [ref, imageFiles])

  return { isDragging, handleDrop }
}
