"use client"

import { RefObject, useEffect } from "react"
import { twMerge } from "tailwind-merge"
import { IoMdClose, IoMdImage } from "react-icons/io"

import { useGlobalImagePreview } from "@/store/ui/useGlobalImagePreview"
import { useLoading } from "@/store/ui/useLoading"
import { useMessages } from "@/store/ui/useMessages"
import { useScopedI18n } from "@/locales/client"

// http://localhost:6006/?path=/story/support-supportexample--closed-button
export function PastedImagePreview({ containerRef }: { containerRef?: RefObject<HTMLDivElement> }) {
  const { image, setImage } = useMessages()
  const { setImage: setImageToPreview } = useGlobalImagePreview()
  const { isLoading } = useLoading()
  const t = useScopedI18n("support")

  // Validate file on mount and periodically
  useEffect(() => {
    if (!image) return

    const checkFile = async () => {
      const isValid = await new Promise<boolean>(resolve => {
        const reader = new FileReader()
        reader.onerror = () => resolve(false)
        reader.onload = () => resolve(true)
        try {
          reader.readAsDataURL(image)
        } catch {
          resolve(false)
        }
      })

      if (!isValid) setImage(null)
    }

    checkFile()
    const interval = setInterval(checkFile, 5000)
    return () => clearInterval(interval)
  }, [image, setImage])

  if (!image) return null

  return (
    <div className="w-full pb-2">
      <div
        className={twMerge(
          "flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-success/10 border border-success/30 hover:border-success/50 transition-colors w-fit text-xs",
          isLoading && "opacity-50 cursor-default pointer-events-none",
        )}
        ref={containerRef}>
        <button
          className="flex items-center gap-1.5 text-title hover:text-success transition-colors"
          onClick={() => setImageToPreview(image, "user", true)}
          title={t("image_attached_click_to_preview")}>
          <IoMdImage className="text-base text-success" />
          <span>{t("image_attached_click_to_preview")}</span>
        </button>
        <button
          className="p-0.5 rounded hover:bg-danger/10 text-subTitle hover:text-danger transition-colors"
          onClick={() => setImage(null)}
          title={t("remove_image")}
          tabIndex={-1}>
          <IoMdClose className="text-sm" />
        </button>
      </div>
    </div>
  )
}
