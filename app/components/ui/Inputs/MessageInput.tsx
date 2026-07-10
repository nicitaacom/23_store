"use client"

import { useRef, useState } from "react"
import { FiSend } from "react-icons/fi"
import { twMerge } from "tailwind-merge"

import { getUserId } from "@/utils/getUserId"
import { uploadImagesAndSendMessage } from "@/functions/support/uploadImagesAndSendMessage"
import { useI18n } from "@/locales/client"
import { useMessagesStore } from "@/store/ui/useMessagesStore"
import { PastedImagePreview } from "@/components/SupportButton/components/PastedImagePreview"

interface MessageInputProps {
  className?: string
  placeholder?: string
  /** When set, the composer clears itself and calls this instead of the customer send flow (support reply path). */
  onSend?: (messageBody: string, image: File | null) => Promise<void>
}

export function MessageInput({ className, placeholder, onSend }: MessageInputProps) {
  const t = useI18n()
  const { messageBodyValue, setMessageBodyValue, image } = useMessagesStore()
  const [height, setHeight] = useState(52)
  const [prevMessageBodyValue, setPrevMessageBodyValue] = useState(messageBodyValue)

  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const userId = getUserId()

  if (messageBodyValue !== prevMessageBodyValue) {
    setPrevMessageBodyValue(messageBodyValue)
    const lineCount = messageBodyValue.split("\n").length
    setHeight(Math.max(42, 42 + (lineCount - 1) * 24))
  }

  async function submitMessage() {
    if (!messageBodyValue.trim().length && !image) return

    if (onSend) {
      const messageBody = messageBodyValue.trim()
      setMessageBodyValue("")
      setHeight(36)
      await onSend(messageBody, image)
      return
    }

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
    <div className="w-full border-t border-border-color/35 bg-modal-surface px-3 py-3">
      <PastedImagePreview />
      <div className="flex items-end gap-2 rounded-xl border border-border-color/25 bg-foreground/30 px-4 py-2.5 shadow-compact transition-colors duration-150 focus-within:border-brand/40 focus-within:bg-foreground/45">
        <textarea
          ref={textareaRef}
          className={twMerge(
            "hide-scrollbar min-h-[24px] w-full resize-none bg-transparent py-1 text-sm leading-6 text-title outline-none placeholder:text-subTitle/55",
            className,
          )}
          placeholder={placeholder ?? "Type a new message..."}
          autoFocus
          value={messageBodyValue}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          style={{
            overflowY: "auto",
            height: `${height}px`,
          }}></textarea>
        <button
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-success-accent/30 bg-success-accent/15 text-success-accent transition-colors duration-150 hover:bg-success-accent/25 disabled:cursor-not-allowed disabled:opacity-45"
          disabled={!messageBodyValue.trim().length && !image}
          onClick={submitMessage}
          type="button">
          <FiSend size={16} />
        </button>
      </div>
    </div>
  )
}
