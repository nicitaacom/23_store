"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import { IoClose } from "react-icons/io5"
import { twMerge } from "tailwind-merge"
import { motion, AnimatePresence } from "framer-motion"

import { PortalWrapper } from "./PortalWrapper"
import { useGlobalImagePreview } from "@/store/ui/useGlobalImagePreview"
import { OrganicCanvasBackground } from "./OrganicCanvasBackground"
// store/useGlobalImagePreview.ts

export function GlobalImagePreviewPortal() {
  const { image, side, setImage } = useGlobalImagePreview()

  return <FileImagePreview image={image} side={side} isShowImage={!!image} isFullscreen onClose={() => setImage(null, side)} />
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

  useEffect(() => {
    if (!image) return

    const img = new window.Image()
    img.src = URL.createObjectURL(image)

    img.onload = () => {
      setDimensions({ width: img.naturalWidth, height: img.naturalHeight })
      URL.revokeObjectURL(img.src)
    }

    // ⌨️ Escape key handler
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose?.()
      }
    }

    window.addEventListener("keydown", handleEsc)

    return () => {
      window.removeEventListener("keydown", handleEsc)
    }
  }, [image])

  return (
    <AnimatePresence>
      {image && isFullscreen && isShowImage && (
        <PortalWrapper>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, transition: { duration: 0.3 } }}
            exit={{ opacity: 0, transition: { duration: 0.3 } }}
            className={twMerge(
              "fixed inset-0 z-[101] flex justify-center items-center backdrop-blur-[8px]",
              // TODO - I don't understand this logic - why - explain this
              side === "user" ? "left-[1px] top-[65px]" : "top-[64px] tablet:top-[81px] left-[0px] laptop:left-[16rem]",
            )}
            onClick={onClose}>
            <OrganicCanvasBackground
              parentClassName="flex justify-center items-center"
              className="fixed bg-gradient-to-tr from-gray-700/70 via-gray-800/75 to-gray-900/80 inset-0 z-[102]">
              <div className="relative group flex justify-center items-center">
                <Image
                  unoptimized
                  src={URL.createObjectURL(image)}
                  alt="img-preview"
                  width={dimensions?.width ?? 1920}
                  height={dimensions?.height ?? 1080}
                  sizes="auto"
                  className="object-contain max-w-[90vw] h-auto max-h-[calc(100vh-65px-32px)]"
                />

                {/* File info overlay */}
                <div
                  className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-black/25 text-white text-xs px-3 py-1 rounded-full
                whitespace-nowrap backdrop-blur-sm border border-black/10 shadow">
                  {image.name} • {formatFileSize(image.size)}
                  {dimensions && ` • ${dimensions.width}×${dimensions.height}`}
                </div>

                {/* Close button */}
                <button
                  className="absolute top-2 right-2 w-8 h-8 laptop:w-[32px] laptop:h-[32px] flex justify-center items-center bg-danger
                rounded hover:scale-105 duration-150"
                  onClick={e => {
                    e.stopPropagation()
                    onClose?.()
                  }}>
                  <IoClose />
                </button>
              </div>
            </OrganicCanvasBackground>
          </motion.div>
        </PortalWrapper>
      )}
    </AnimatePresence>
  )
}
