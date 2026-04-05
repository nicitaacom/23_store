"use client"

import { useEffect, useRef, useState } from "react"
import { FiSend } from "react-icons/fi"
import { twMerge } from "tailwind-merge"

import { getUserId } from "@/utils/getUserId"
import { PastedImagePreview } from "@/components/SupportButton/components/PastedImagePreview"
import { uploadImagesAndSendMessage } from "@/functions/support/uploadImagesAndSendMessage"
import { useMessagesStore } from "@/store/ui/useMessagesStore"
import { useI18n } from "@/locales/client"

interface MessageInputProps {
  className?: string
}

export function MessageInput({ className }: MessageInputProps) {
  const t = useI18n()
  const { messageBodyValue, setMessageBodyValue, image } = useMessagesStore()
  const [height, setHeight] = useState(52)

  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const userId = getUserId()

  useEffect(() => {
    const lineCount = messageBodyValue.split("\n").length

    setHeight(Math.max(42, 42 + (lineCount - 1) * 24))
  }, [messageBodyValue])

  async function submitMessage() {
    if (!messageBodyValue.trim().length && !image) return

    setMessageBodyValue("")
    setHeight(36)
    await uploadImagesAndSendMessage(t, setHeight, messageBodyValue.trim(), userId, textareaRef)
  }

  const handleKeyDown = async (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter") {
      if (event.shiftKey) {
        event.preventDefault()

        const cursorPosition = event.currentTarget.selectionStart
        const beforeText = messageBodyValue.slice(0, cursorPosition)
        const afterText = messageBodyValue.slice(cursorPosition)
        const newValue = `${beforeText}\n${afterText}`
        setMessageBodyValue(newValue)

        setTimeout(() => {
          if (textareaRef.current) {
            textareaRef.current.selectionStart = textareaRef.current.selectionEnd = cursorPosition + 1
            ensureCursorVisibility(textareaRef.current)
            textareaRef.current.scrollTop = textareaRef.current.scrollHeight
          }
        }, 0)
      } else {
        event.preventDefault()
        await submitMessage()
      }
    }
  }

  const handleChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessageBodyValue(event.target.value)
  }

  function ensureCursorVisibility(textarea: HTMLTextAreaElement) {
    const lineHeight = 24
    const { clientHeight, scrollTop } = textarea
    const cursorPosition = textarea.selectionStart
    const cursorLine = textarea.value.substring(0, cursorPosition).split("\n").length
    const topLineVisible = Math.ceil(scrollTop / lineHeight) + 1
    const bottomLineVisible = topLineVisible + Math.floor(clientHeight / lineHeight) - 1

    if (cursorLine < topLineVisible || cursorLine > bottomLineVisible) {
      const newScrollTop = (cursorLine - Math.floor(clientHeight / lineHeight)) * lineHeight
      textarea.scrollTop = newScrollTop
    }
  }

  return (
    <div className="w-full border-t border-white/8 bg-[#171922] px-3 py-3">
      <PastedImagePreview />
      <div className="flex items-end gap-2 rounded border border-white/8 bg-[#20232d] px-3 py-2 shadow-compact">
        <textarea
          ref={textareaRef}
          className={twMerge(
            "hide-scrollbar min-h-[24px] w-full resize-none bg-transparent py-1 text-sm leading-6 text-slate-100 outline-none placeholder:text-slate-500",
            className,
          )}
          placeholder="Type a new message..."
          autoFocus
          value={messageBodyValue}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          style={{
            overflowY: "auto",
            height: `${height}px`,
          }}></textarea>
        <button
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded border border-violet-500/35 bg-violet-600 text-white shadow-compact transition-colors duration-150 hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-45"
          disabled={!messageBodyValue.trim().length && !image}
          onClick={submitMessage}
          type="button">
          <FiSend size={16} />
        </button>
      </div>
    </div>
  )
}
