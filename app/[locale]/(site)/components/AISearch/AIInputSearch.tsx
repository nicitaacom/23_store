"use client"

import { useEffect, useState } from "react"
import { BiChevronDown } from "react-icons/bi"
import { BsStars } from "react-icons/bs"
import { useSwipeable } from "react-swipeable"
import { twMerge } from "tailwind-merge"

import { useScopedI18n } from "@/locales/client"
import { MemoryDebug } from "../MemoryDebug"
import { ChatHeader } from "./ChatHeader"
import { ChatInput } from "./ChatInput"
import { ChatMessages } from "./ChatMessages"
import { useAIChat } from "./hooks/useAIChat"

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
      if (absY > 24) setIsExpanded(true)
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

  // Reserve 56px for the fixed support button and 16px for the page paddings around the sheet.
  const mobileSheetWidth = "calc(100% - 56px - 16px)"

  return (
    <div
      {...swipeHandlers}
      className={twMerge(
        "fixed bottom-4 left-4 z-[110] overflow-hidden rounded-[4px] border border-border-color/30 bg-background/95 shadow-[0_20px_50px_rgba(0,0,0,0.35)] backdrop-blur-xl transition-[height,transform] duration-300 laptop:hidden",
        isExpanded ? "h-[min(72vh,680px)] tablet:h-[min(62vh,720px)]" : "h-[48px]",
      )}
      style={{ width: mobileSheetWidth }}>
      <button
        type="button"
        onClick={() => setIsExpanded(current => !current)}
        aria-expanded={isExpanded}
        className="flex h-12 w-full items-center gap-3 border-b border-success/10 px-3 text-left">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[4px] border border-success/20 bg-success/10">
          <BsStars className="text-base text-success" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-sm font-semibold text-title">{t("header_title")}</h3>
        </div>
        <div className="flex items-center gap-2">
          <span className="h-1 w-8 rounded-full bg-success/25" />
          <BiChevronDown
            className={twMerge("text-xl text-success transition-transform duration-300", isExpanded && "rotate-180")}
          />
        </div>
      </button>

      <div className={twMerge("min-h-0 flex-1 flex-col gap-3 px-2 pb-2 pt-2", isExpanded ? "flex" : "hidden")}>
        {assistantBody}
      </div>
    </div>
  )
}
