"use client"

import { useRef, useEffect } from "react"
import { AiOutlineSearch, AiOutlineSend } from "react-icons/ai"
import { BsStars } from "react-icons/bs"
import { useLoading } from "@/store/ui/useLoading"
import { MessageBoxAI } from "./MessageBoxAI"
import { useAIChatStore } from "@/components/Navbar/stores/useAIChat"

type ChatMessage = { role: "user" | "ai"; text: string }

export function AIInputSearch() {
  const { promptValue, setPromptValue, conversation, setConversation, memory, setMemory } = useAIChatStore()
  const { isLoading, setIsLoading } = useLoading()
  const chatEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [conversation])

  useEffect(() => {
    if (!isLoading && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isLoading])

  const handleSubmit = async () => {
    if (!promptValue.trim() || isLoading) return

    const userMessage = promptValue.trim()
    const newConversation: ChatMessage[] = [...conversation, { role: "user", text: userMessage }]
    setConversation(newConversation)
    setPromptValue("")
    setIsLoading(true)

    try {
      const response = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          promptValue: userMessage,
          memory,
        }),
      })

      const data = await response.json()

      if (data.reply && data.memory) {
        setConversation([...newConversation, { role: "ai", text: data.reply }])
        setMemory(data.memory)
      }
    } catch (error) {
      console.error("AI Chat Error:", error)
      setConversation([...newConversation, { role: "ai", text: "Oops, something went wrong. Try again." }])
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  return (
    <div className="w-full max-w-4xl mx-auto flex flex-col gap-5 font-primary">
      {process.env.NODE_ENV === "development" && (
        <div className="fixed top-16 right-4 max-w-xs p-3 bg-warning/10 border border-warning rounded-lg shadow-lg z-50">
          <h4 className="text-xs font-bold text-warning mb-1.5">DEV: Memory</h4>
          <p className="text-xs text-title break-words">{memory || "No memory yet"}</p>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center gap-3 px-1">
        <div className="p-2 rounded-lg bg-success/10 border border-success/20">
          <BsStars className="text-lg text-success" />
        </div>
        <div>
          <h3 className="text-title font-semibold text-base">AI Shopping Assistant</h3>
          <p className="text-subTitle text-sm">Find your perfect product in seconds</p>
        </div>
      </div>

      {/* Chat Container */}
      <div className="rounded-xl border border-border-color bg-foreground-accent/30 backdrop-blur-sm overflow-hidden">
        <div className="flex flex-col gap-3 p-4 min-h-[420px] max-h-[520px] overflow-y-auto">
          {conversation.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full gap-3 py-8">
              <div className="p-3 rounded-full bg-success/10 border border-success/20">
                <BsStars className="text-3xl text-success" />
              </div>
              <div className="text-center space-y-1.5">
                <p className="text-title font-semibold">Ready to help you shop</p>
                <p className="text-subTitle text-sm max-w-sm">
                  Describe what you&apos;re looking for and I&apos;ll guide you to the perfect product
                </p>
              </div>
            </div>
          )}

          {conversation.map((msg, i) => (
            <MessageBoxAI key={i} role={msg.role} text={msg.text} />
          ))}

          {isLoading && (
            <div className="flex justify-start animate-[fadeIn_0.3s_ease-in]">
              <div className="px-4 py-3 rounded-lg bg-foreground-accent border border-border-color">
                <div className="flex gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-subTitle animate-[bounce_1s_infinite_0ms]"></span>
                  <span className="w-2 h-2 rounded-full bg-subTitle animate-[bounce_1s_infinite_200ms]"></span>
                  <span className="w-2 h-2 rounded-full bg-subTitle animate-[bounce_1s_infinite_400ms]"></span>
                </div>
              </div>
            </div>
          )}

          <div ref={chatEndRef} />
        </div>
      </div>

      {/* Input Area */}
      <div className="rounded-xl border-2 border-border-color bg-foreground-accent hover:border-success/50 focus-within:border-success transition-colors duration-200">
        <div className="flex items-center gap-3 px-4 py-3">
          <div className="text-subTitle">
            <AiOutlineSearch className="text-xl" />
          </div>

          <textarea
            ref={inputRef}
            placeholder="Describe what you want..."
            value={promptValue}
            onChange={e => {
              const value = e.target.value
              if (value.length <= 500) {
                setPromptValue(value)
              }
            }}
            onKeyDown={e => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault()
                handleSubmit()
              }
            }}
            onInput={e => {
              const target = e.target as HTMLTextAreaElement
              target.style.height = "auto"
              target.style.height = `${Math.min(target.scrollHeight, 120)}px`
            }}
            disabled={isLoading}
            rows={1}
            className="hide-scrollbar min-h-[40px] leading-5 max-h-[120px] flex-1 bg-transparent text-title placeholder:text-subTitle
             outline-none text-[15px] resize-none overflow-y-auto "
          />

          <div className="flex items-center gap-2">
            <div className="hidden laptop:flex items-center gap-1 px-2 py-1 rounded-md bg-background border border-border-color">
              <span className="text-xs font-medium text-subTitle">⌘</span>
              <span className="text-xs font-medium text-subTitle">K</span>
            </div>

            <button
              type="button"
              onClick={handleSubmit}
              disabled={!promptValue.trim() || isLoading}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-success text-foreground font-medium hover:bg-success-accent transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed">
              <span className="hidden mobile:inline text-sm text-black">Send</span>
              <AiOutlineSend className="text-base" />
            </button>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes bounce {
          0%,
          100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-3px);
          }
        }
      `}</style>
    </div>
  )
}
