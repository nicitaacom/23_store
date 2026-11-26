"use client"

import { useEffect, useState } from "react"
import { BiChevronDown } from "react-icons/bi"
import { BsStars } from "react-icons/bs"
import { useSwipeable } from "react-swipeable"
import { twMerge } from "tailwind-merge"

import { useAIChat } from "./hooks/useAIChat"
import { ChatHeader } from "./ChatHeader"
import { ChatInput } from "./ChatInput"
import { ChatMessages } from "./ChatMessages"
import { MemoryDebug } from "../MemoryDebug"
import { useScopedI18n } from "@/locales/client"
import { useSupportDropdown } from "@/store/ui/useSupportDropdown"

// http://localhost:6006/?path=/story/commerce-aisearch--search-entry-point
export function AIInputSearch() {
  const t = useScopedI18n("aichat")
  const {
    promptValue,
    setPromptValue,
    conversation,
    memory,
    debugContext,
    isLoading,
    chatEndRef,
    inputRef,
    handleSubmit,
    generateImage,
    addToCart,
    handleKeyPress,
    handleTextareaInput,
  } = useAIChat()
  const [isDesktop, setIsDesktop] = useState<boolean | null>(null)
  const [isExpanded, setIsExpanded] = useState(false)

  useEffect(() => useSupportDropdown.subscribe(({ isDropdown }) => {
    if (isDropdown) setIsExpanded(false)
  }), [])

  function openAssistant() {
    useSupportDropdown.getState().closeDropdown()
    setIsExpanded(true)
  }

  useEffect(() => {
    if (typeof window === "undefined") return

    const mediaQuery = window.matchMedia("(min-width: 1024px)")

    const updateLayout = () => {
      setIsDesktop(mediaQuery.matches)

      if (mediaQuery.matches) {
        setIsExpanded(false)
      }
    }

    updateLayout()

    mediaQuery.addEventListener("change", updateLayout)

    return () => {
      mediaQuery.removeEventListener("change", updateLayout)
    }
  }, [])

  const assistantBody = (
    <>
      <ChatMessages conversation={conversation} isLoading={isLoading} chatEndRef={chatEndRef} />
      <ChatInput
        promptValue={promptValue}
        setPromptValue={setPromptValue}
        isLoading={isLoading}
        inputRef={inputRef}
        handleSubmit={handleSubmit}
        generateImage={generateImage}
        addToCart={addToCart}
        handleKeyPress={handleKeyPress}
        handleTextareaInput={handleTextareaInput}
      />
      <MemoryDebug memory={memory} debugContext={debugContext} />
    </>
  )

  const swipeHandlers = useSwipeable({
    onSwipedUp: ({ absY }) => {
      if (absY > 24) openAssistant()
    },
    onSwipedDown: ({ absY }) => {
      if (absY > 24) setIsExpanded(false)
    },
    delta: 10,
    trackMouse: false,
    preventScrollOnSwipe: isExpanded,
  })

  if (isDesktop === null) {
    return null
  }

  if (isDesktop) {
    return (
      <aside className="panel-scroll min-h-0 overflow-x-hidden overflow-y-auto rounded-[4px] border border-border-color/20 bg-background/90 px-4 py-2 shadow-2xl shadow-black/10">
        <div className="flex h-full min-h-0 w-full flex-col gap-5 font-primary">
          <ChatHeader />
          {assistantBody}
        </div>
      </aside>
    )
  }

  // 16px inset, 48px chat button, 12px gap, so the sheet ends before the button.
  const mobileSheetWidth = "calc(100% - 16px - 48px - 12px)"
  // dvh follows the visible viewport, so the open sheet stays above the browser chrome.
  const openSheetHeight = "min(72dvh, 680px, calc(100dvh - 4.5rem - max(1rem, env(safe-area-inset-bottom))))"

  return (
    <div
      style={{
        width: isExpanded ? mobileSheetWidth : "3rem",
        bottom: "max(1rem, env(safe-area-inset-bottom))",
        height: isExpanded ? openSheetHeight : "3rem",
      }}
      className="fixed right-[4.75rem] z-[110] flex flex-col overflow-hidden rounded-lg border border-border-color/30 bg-background/95 shadow-compact backdrop-blur-xl transition-[height,width] duration-300 laptop:hidden"
      {...swipeHandlers}>
      <button
        className={twMerge("flex h-12 w-full shrink-0 items-center", isExpanded ? "gap-3 border-b border-success/10 px-3 text-left" : "justify-center")}
        data-cy="ai-chat-toggle"
        type="button"
        onClick={() => isExpanded ? setIsExpanded(false) : openAssistant()}
        aria-label={t("header_title")}
        aria-expanded={isExpanded}>
        <BsStars className="shrink-0 text-xl text-success" />
        {isExpanded && (
          <>
            <span className="min-w-0 flex-1 truncate text-sm font-semibold text-title">{t("header_title")}</span>
            <BiChevronDown className="shrink-0 text-xl text-success" />
          </>
        )}
      </button>

      <div className={twMerge("min-h-0 flex-1 flex-col gap-3 overflow-hidden px-2 pb-2 pt-2", isExpanded ? "flex" : "hidden")}>
        {assistantBody}
      </div>
    </div>
  )
}
