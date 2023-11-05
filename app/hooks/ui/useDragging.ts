import { useEffect, useState } from "react"

const useDragging = () => {
  const [isDraggingg, setIsDragging] = useState(false)

  useEffect(() => {
    const handler = () => {
      setIsDragging(true)
    }

    const leaveHandler = () => {
      // setIsDragging(false)
    }

    const dropHandler = () => {
      setIsDragging(false)
    }

    const dragEndHandler = () => {
      setIsDragging(false)
    }

    document.addEventListener("dragover", handler, true)
    // document.addEventListener("dragleave", leaveHandler, true)
    document.addEventListener("drop", dropHandler, true)
    document.addEventListener("dragend", dragEndHandler, true)

    return () => {
      document.removeEventListener("dragover", handler)
      // document.removeEventListener("dragleave", leaveHandler)
      document.removeEventListener("drop", dropHandler)
      document.removeEventListener("dragend", dragEndHandler)
    }
  }, [])

  return { isDraggingg }
}

export default useDragging
