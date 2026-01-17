"use client"

import { AiOutlineSearch, AiOutlineSend } from "react-icons/ai"
import { HiOutlineSparkles } from "react-icons/hi2"
import { Button } from "@/components/ui/Button"

type Props = {
  promptValue: string
  setPromptValue: (value: string) => void
  isLoading: boolean
  inputRef: React.RefObject<HTMLTextAreaElement>
  handleSubmit: () => void
  generateImage: () => void
  handleKeyPress: (event: React.KeyboardEvent) => void
  handleTextareaInput: (event: React.FormEvent<HTMLTextAreaElement>) => void
}

export function ChatInput({
  promptValue,
  setPromptValue,
  isLoading,
  inputRef,
  handleSubmit,
  generateImage,
  handleKeyPress,
  handleTextareaInput,
}: Props) {
  return (
    <div className="rounded-xl border-2 border-border-color bg-foreground-accent hover:border-success/50 focus-within:border-success transition-colors duration-200">
      <div className="flex items-center gap-3 px-4 py-3">
        <div className="text-subTitle">
          <AiOutlineSearch className="text-xl" />
        </div>

        <textarea
          ref={inputRef}
          placeholder="Describe what you want..."
          value={promptValue}
          onChange={event => {
            const value = event.target.value
            if (value.length <= 500) setPromptValue(value)
          }}
          onKeyDown={handleKeyPress}
          onInput={handleTextareaInput}
          disabled={isLoading}
          rows={1}
          className="hide-scrollbar min-h-[40px] leading-5 max-h-[120px] flex-1 bg-transparent text-title placeholder:text-subTitle outline-none text-[15px] resize-none overflow-y-auto"
        />

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon-md"
            rounded="lg"
            onClick={generateImage}
            disabled={!promptValue.trim() || isLoading}
            title="Generate Image"
            className="text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/20">
            <HiOutlineSparkles className="text-xl" />
          </Button>

          <div className="hidden laptop:flex items-center gap-1 px-2 py-1 rounded-md bg-background border border-border-color">
            <span className="text-xs font-medium text-subTitle">⌘</span>
            <span className="text-xs font-medium text-subTitle">K</span>
          </div>

          <Button
            variant="success"
            size="md"
            rounded="lg"
            onClick={handleSubmit}
            disabled={!promptValue.trim() || isLoading}
            rightIcon={<AiOutlineSend className="text-base" />}>
            <span className="hidden mobile:inline text-sm text-black">Send</span>
          </Button>
        </div>
      </div>
    </div>
  )
}
