"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import { AnimatePresence, motion } from "framer-motion"
import { IoClose } from "react-icons/io5"

import { OrganicCanvasBackground } from "./OrganicCanvasBackground"
import { PortalWrapper } from "./PortalWrapper"
import { useGlobalImagePreview } from "@/store/ui/useGlobalImagePreview"

export function GlobalImagePreviewPortal() {
  const { clearImage, image, isFullscreen, side } = useGlobalImagePreview()

  return <FileImagePreview image={image} side={side} isShowImage={!!image} isFullscreen={isFullscreen} onClose={clearImage} />
}

export function FileImagePreview({
  side,
  image,
  isShowImage,
  isFullscreen = false,
  onClose,
}: {
  side: "user" | "support"
  image: File | null
  isShowImage: boolean
  isFullscreen?: boolean
  onClose?: () => void
}) {
  const formatFileSize = (bytes: number) =>
    bytes > 1024 * 1024 ? `${(bytes / (1024 * 1024)).toFixed(2)} MB` : `${(bytes / 1024).toFixed(2)} KB`

  const [dimensions, setDimensions] = useState<{ width: number; height: number } | null>(null)
  const [imageUrl, setImageUrl] = useState("")

  useEffect(() => {
    if (!image) {
      setDimensions(null)
      setImageUrl("")
      return
    }

    const objectUrl = URL.createObjectURL(image)
    const img = new window.Image()

    setImageUrl(objectUrl)
    img.src = objectUrl

    img.onload = () => {
      setDimensions({ width: img.naturalWidth, height: img.naturalHeight })
    }

    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose?.()
    }

    window.addEventListener("keydown", handleEsc)

    return () => {
      window.removeEventListener("keydown", handleEsc)
      URL.revokeObjectURL(objectUrl)
    }
  }, [image, onClose])

  return (
    <AnimatePresence>
      {image && imageUrl && isFullscreen && isShowImage && (
        <PortalWrapper>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, transition: { duration: 0.22 } }}
            exit={{ opacity: 0, transition: { duration: 0.18 } }}
            className="fixed inset-0 z-[2100] flex items-center justify-center backdrop-blur-[10px]"
            onClick={onClose}>
            <OrganicCanvasBackground
              parentClassName="flex h-full w-full items-center justify-center"
              className="absolute inset-0 bg-[radial-gradient(circle_at_top,hsl(var(--foreground-accent)/0.38),rgba(10,14,24,0.96)_62%)]"
              brandHsl={side === "user" ? "137, 82%, 44%" : "210, 100%, 50%"}>
              <button
                className="absolute right-3 top-3 z-20 flex h-10 w-10 items-center justify-center rounded-lg border border-white/10 bg-black/45 text-white transition-all duration-150 hover:scale-105 hover:bg-danger"
                onClick={onClose}
                type="button">
                <IoClose size={20} />
              </button>

              <div
                className="relative flex max-h-full w-full max-w-[min(96vw,2200px)] items-center justify-center"
                onClick={event => event.stopPropagation()}>
                <Image
                  unoptimized
                  className="h-auto max-h-[calc(100vh-56px)] w-auto max-w-full rounded-[24px] border border-white/10 object-contain shadow-[0_36px_120px_rgba(0,0,0,0.45)]"
                  src={imageUrl}
                  alt="Image preview"
                  width={dimensions?.width ?? 1920}
                  height={dimensions?.height ?? 1080}
                  sizes="100vw"
                />

                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full border border-white/10 bg-black/35 px-3 py-1 text-xs text-white/90 shadow backdrop-blur-sm">
                  {image.name} • {formatFileSize(image.size)}
                  {dimensions && ` • ${dimensions.width}×${dimensions.height}`}
                </div>
              </div>
            </OrganicCanvasBackground>
          </motion.div>
        </PortalWrapper>
      )}
    </AnimatePresence>
  )
}
