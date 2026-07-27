"use client"

import { AiOutlineSearch, AiOutlineSend } from "react-icons/ai"
import { HiOutlineSparkles } from "react-icons/hi2"
import { BsCart3 } from "react-icons/bs"

import { useScopedI18n } from "@/locales/client"
import { Button } from "@/components/ui/Button"

type Props = {
  promptValue: string
  setPromptValue: (value: string) => void
  isLoading: boolean
  inputRef: React.RefObject<HTMLTextAreaElement>
  handleSubmit: () => void
  generateImage: () => void
  addToCart: () => void
  handleKeyPress: (event: React.KeyboardEvent) => void
  handleTextareaInput: (event: React.FormEvent<HTMLTextAreaElement>) => void
}

// http://localhost:6006/?path=/story/commerce-aisearch--search-entry-point
export function ChatInput({
  promptValue,
  setPromptValue,
  isLoading,
  inputRef,
  handleSubmit,
  generateImage,
  addToCart,
  handleKeyPress,
  handleTextareaInput,
}: Props) {
  const t = useScopedI18n("aichat")
  return (
    <div className="rounded-xl border-2 border-border-color bg-foreground-accent hover:border-success/50 focus-within:border-success transition-colors duration-200">
      <div className="flex items-center gap-3 px-4 py-3">
        <div className="flex items-center gap-2">
          <Button
            className="text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-700/40 transition-colors"
            variant="ghost"
            size="icon-md"
            rounded="lg"
            onClick={generateImage}
            disabled={isLoading}
            title="Generate Image">
            <HiOutlineSparkles className="text-xl" />
          </Button>

          <Button variant="ghost" size="icon-md" rounded="lg" onClick={addToCart} disabled={isLoading} title="Add to Cart">
            <BsCart3 className="text-xl" />
          </Button>

          <div className="w-px h-6 bg-border-color" />
        </div>

        <div className="text-subTitle">
          <AiOutlineSearch className="text-xl" />
        </div>

        <textarea
          className="hide-scrollbar min-h-[40px] leading-5 max-h-[120px] flex-1 bg-transparent
          text-title placeholder:text-subTitle outline-none text-[15px] resize-none overflow-y-auto"
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
        />

        <div className="flex items-center gap-2">
          <div className="hidden laptop:flex items-center gap-1 px-2 py-1 rounded-md bg-background border border-border-color">
            <span className="text-xs font-medium text-subTitle">⌘</span>
            <span className="text-xs font-medium text-subTitle">K</span>
          </div>

          <Button
            className="disabled:border-border-color/35 disabled:bg-background/55 disabled:text-subTitle"
            variant="success"
            size="md"
            rounded="lg"
            onClick={handleSubmit}
            disabled={!promptValue.trim() || isLoading}
            rightIcon={<AiOutlineSend className="text-base" />}>
            <span className="hidden mobile:inline text-sm">{t("button.send")}</span>
          </Button>
        </div>
      </div>
    </div>
  )
}
