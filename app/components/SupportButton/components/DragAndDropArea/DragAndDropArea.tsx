"use client"

import ReactImageUploading, { ImageListType } from "react-images-uploading"
import { twMerge } from "tailwind-merge"

import { showToastWarningFn } from "./functions/showToastWarning"
import { useDragAndDrop } from "@/hooks/support/useDragAndDrop"
import { useI18n } from "@/locales/client"
import { useMessages } from "@/store/ui/useMessages"
import { MAX_IMAGE_FILE_SIZE_BYTES } from "@/constants/uploadLimits"

// http://localhost:6006/?path=/story/support-supportexample--closed-button
export function DragAndDropArea() {
  const t = useI18n()
  const { image, setImage } = useMessages()
  const { isDragging, handleDrop } = useDragAndDrop()

  return (
    <div className={twMerge("pointer-events-none absolute inset-0", isDragging ? "z-30" : "z-0")}>
      <ReactImageUploading
        value={image as unknown as ImageListType}
        onChange={value => {
          const newFiles = value.map(img => img.file!).filter(Boolean)
          setImage(newFiles[0])
        }}
        maxNumber={1}
        maxFileSize={MAX_IMAGE_FILE_SIZE_BYTES}
        onError={(errors, files) => {
          void showToastWarningFn(t, errors, { maxNumber: 1, maxFileSize: MAX_IMAGE_FILE_SIZE_BYTES }, files)
        }}>
        {({ dragProps }) => (
          <div
            className={twMerge(
              "absolute inset-0 transition-all duration-200",
              isDragging ? "pointer-events-auto" : "pointer-events-none",
            )}
            {...dragProps}
            onDrop={event => {
              dragProps.onDrop(event)
              handleDrop()
            }}>
            <section
              className={twMerge(
                "absolute inset-3 flex items-center justify-center rounded-[24px] border-2 border-dashed transition-all duration-200",
                isDragging ? "border-success/45 bg-background/72 opacity-100 backdrop-blur-sm" : "border-transparent opacity-0",
              )}>
              <div className="rounded-[20px] border border-success/20 bg-success/10 px-4 py-3 text-center shadow-[0_18px_40px_rgba(0,0,0,0.18)]">
                <p className="text-sm font-semibold text-title">{t("support.drop_image_title")}</p>
                <p className="mt-1 text-xs text-subTitle">{t("support.drop_image_subtitle")}</p>
              </div>
            </section>
          </div>
        )}
      </ReactImageUploading>
    </div>
  )
}
