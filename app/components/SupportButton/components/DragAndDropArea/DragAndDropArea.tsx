"use client"

import { useRef } from "react"
import ReactImageUploading, { ImageListType } from "react-images-uploading"

import { showToastWarningFn } from "./functions/showToastWarning"
import { useDragAndDrop } from "@/hooks/support/useDragAndDrop"
import { useMessagesStore } from "@/store/ui/useMessagesStore"

export function DragAndDropArea() {
  const { image, setImage } = useMessagesStore()

  const wrapperRef = useRef<HTMLDivElement | null>(null)
  const { isDragging, handleDrop } = useDragAndDrop(wrapperRef)

  return (
    <div className={`absolute inset-0 w-full h-full ${isDragging ? "z-20" : "z-10"}`}>
      {/* Top padding */}
      <div
        className="absolute top-[56px] left-0 right-0 h-8 bg-background/80 backdrop-blur-sm text-white/60 text-center shadow-lg z-20"
        ref={wrapperRef}>
        drag&drop here
      </div>

      {/* Left padding */}
      {/* <div
        className="absolute top-0 bottom-0 left-0 w-8 bg-background/80 backdrop-blur-sm rounded-l-lg shadow-lg z-20"
        ref={wrapperRef}
      /> */}

      {/* Right padding */}
      {/* <div
        className="absolute top-0 bottom-0 right-0 w-8 bg-background/80 backdrop-blur-sm rounded-r-lg shadow-lg z-20"
        ref={wrapperRef}
      /> */}

      {/* Bottom padding */}
      <div
        className="absolute bottom-0 left-0 right-0 h-16 bg-background/80 backdrop-blur-sm shadow-lg z-20"
        ref={wrapperRef}
      />

      <ReactImageUploading
        value={image as unknown as ImageListType}
        onChange={value => {
          const newFiles = value.map(img => img.file!).filter(Boolean)
          setImage(newFiles[0])
        }}
        maxNumber={1}
        maxFileSize={4e6}
        onError={errors => showToastWarningFn(errors, 1)}>
        {({ onImageUpload, onImageUpdate, onImageRemove, dragProps }) => (
          <div
            className="w-full h-full relative z-20 overflow-hidden"
            {...dragProps}
            onDrop={e => {
              dragProps.onDrop(e), handleDrop()
            }}
            ref={wrapperRef}>
            <section className="w-full h-full relative">
              {isDragging && (
                <div
                  className="absolute w-full h-full  inset-0.5 bottom-2 z-[4999] bg-[rgba(0,0,0,0.6)] max-w-[100%] 
                  flex justify-center items-center text-title pointer-events-auto">
                  Drag & drop here
                </div>
              )}
            </section>
          </div>
        )}
      </ReactImageUploading>
    </div>
  )
}
