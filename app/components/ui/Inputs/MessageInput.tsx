"use client"

import { useEffect, useRef, useState } from "react"
import { twMerge } from "tailwind-merge"

import { getUserId } from "@/utils/getUserId"
import { PastedImagePreview } from "@/components/SupportButton/components/PastedImagePreview"
import { uploadImagesAndSendMessage } from "@/functions/support/uploadImagesAndSendMessage"
import { useMessagesStore } from "@/store/ui/useMessagesStore"

interface MessageInputProps {
  className?: string
}

export function MessageInput({ className }: MessageInputProps) {
  const { messageBodyValue, setMessageBodyValue, image } = useMessagesStore()
  const [height, setHeight] = useState(52) // Initialize with the base height for one line

  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const userId = getUserId()

  // shift+enter managed by ChatGPT-4 - copy paste all code to it if issues

  useEffect(() => {
    // Recalculate height every time the value changes
    const lineCount = messageBodyValue.split("\n").length

    setHeight(Math.max(42, 42 + (lineCount - 1) * 24)) // Adjust height based on line count, 24px per line
  }, [messageBodyValue])

  const handleKeyDown = async (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter") {
      if (event.shiftKey) {
        event.preventDefault() // Prevent default behavior for Shift+Enter

        // Insert newline at the current cursor position
        const cursorPosition = event.currentTarget.selectionStart
        const beforeText = messageBodyValue.slice(0, cursorPosition)
        const afterText = messageBodyValue.slice(cursorPosition)
        const newValue = `${beforeText}\n${afterText}`
        setMessageBodyValue(newValue) // Update value to trigger height recalculation

        setTimeout(() => {
          if (textareaRef.current) {
            textareaRef.current.selectionStart = textareaRef.current.selectionEnd = cursorPosition + 1
            // Adjust scrollTop to ensure the new line and cursor are visible
            ensureCursorVisibility(textareaRef.current)
            textareaRef.current.scrollTop = textareaRef.current.scrollHeight // scroll to bottom
          }
        }, 0)
      } else {
        event.preventDefault() // Prevent default form submission on Enter
        // Trim and check if the message is not just spaces or newlines
        if (messageBodyValue.trim().length || image) {
          setMessageBodyValue("") // Clear the textarea after sending the message
          setHeight(36) // Reset height to initial value after message is sent
          await uploadImagesAndSendMessage(setHeight, messageBodyValue.trim(), userId, textareaRef)
        }
      }
    }
  }

  const handleChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessageBodyValue(event.target.value)
  }

  // Ensure the cursor is visible in the textarea, adjusting scroll if necessary
  function ensureCursorVisibility(textarea: HTMLTextAreaElement) {
    const lineHeight = 24 // Assuming line height is 24px
    const { scrollHeight, clientHeight, scrollTop } = textarea
    const cursorPosition = textarea.selectionStart
    const cursorLine = textarea.value.substring(0, cursorPosition).split("\n").length
    const topLineVisible = Math.ceil(scrollTop / lineHeight) + 1
    const bottomLineVisible = topLineVisible + Math.floor(clientHeight / lineHeight) - 1

    if (cursorLine < topLineVisible || cursorLine > bottomLineVisible) {
      // Align the cursor line to the bottom of the visible area
      const newScrollTop = (cursorLine - Math.floor(clientHeight / lineHeight)) * lineHeight
      textarea.scrollTop = newScrollTop
    }
  }

  return (
    <div className="w-full bg-foreground-accent px-4 py-3 border-t border-border-color">
      <PastedImagePreview />
      <textarea
        ref={textareaRef}
        className={twMerge(
          `w-full !max-h-[61px] min-h-[36px] resize-none hide-scrollbar rounded-md border border-border-color bg-background/50 px-3 py-2 outline-none text-title placeholder:text-subTitle focus:border-success/50 transition-colors`,
          className,
        )}
        placeholder="Enter message..."
        autoFocus
        value={messageBodyValue}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        style={{
          overflowY: "auto",
          height: `${height}px`,
        }}></textarea>
    </div>
  )
}
