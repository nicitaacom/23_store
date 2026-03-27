"use client"

import { MemoryDebug } from "../MemoryDebug"
import { ChatHeader } from "./ChatHeader"
import { ChatInput } from "./ChatInput"
import { ChatMessages } from "./ChatMessages"
import { useAIChat } from "./hooks/useAIChat"

export function AIInputSearch() {
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

  return (
    <div className="flex h-full min-h-0 w-full flex-col gap-5 font-primary">
      <ChatHeader />
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
    </div>
  )
}
