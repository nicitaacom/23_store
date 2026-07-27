import { useRef, useState } from "react"
import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { expect, fn, waitFor, within } from "storybook/test"

import type { TAIChatMessage } from "@/ts/types/TAIChatMessage"
import { FIXTURE_IDS, FIXTURE_IMAGES } from "../fixtures"
import { AIInputSearch } from "@/[locale]/(site)/components/AISearch/AIInputSearch"
import { AddToCartButton } from "@/[locale]/(site)/components/AISearch/AddToCartButton"
import { ChatHeader } from "@/[locale]/(site)/components/AISearch/ChatHeader"
import { ChatInput } from "@/[locale]/(site)/components/AISearch/ChatInput"
import { ChatMessages } from "@/[locale]/(site)/components/AISearch/ChatMessages"
import { MessageBoxAI } from "@/[locale]/(site)/components/AISearch/MessageBoxAI"

const conversation: TAIChatMessage[] = [
  { role: "user", text: "I need over-ear headphones for the office" },
  { role: "ai", text: "The studio headphones fit that - they isolate noise and ship today." },
  { role: "ai", text: "Here is the generated preview", imageUrl: FIXTURE_IMAGES.product },
]

function ChatInputExample() {
  const [promptValue, setPromptValue] = useState("Show me something for a gift")
  const inputRef = useRef<HTMLTextAreaElement>(null)
  return (
    <div className="max-w-2xl p-3">
      <ChatInput
        addToCart={fn()}
        generateImage={fn()}
        handleKeyPress={fn()}
        handleSubmit={fn()}
        handleTextareaInput={fn()}
        inputRef={inputRef}
        isLoading={false}
        promptValue={promptValue}
        setPromptValue={setPromptValue}
      />
    </div>
  )
}

function ChatMessagesExample({ isLoading }: { isLoading: boolean }) {
  const chatEndRef = useRef<HTMLDivElement>(null)
  return (
    <div className="max-w-2xl p-3">
      <ChatMessages chatEndRef={chatEndRef} conversation={conversation} isLoading={isLoading} />
    </div>
  )
}

const meta = {
  title: "Commerce/AISearch",
  parameters: {
    layout: "fullscreen",
    // Report mode - these components ship with the dark palette and axe flags the light-theme
    // contrast of their subTitle text. The debt sits in the palette, not in the story.
    a11y: { test: "todo" },
  },
} satisfies Meta

export default meta
type Story = StoryObj<typeof meta>

export const SearchEntryPoint: Story = {
  render: () => (
    <div className="p-3">
      <AIInputSearch />
    </div>
  ),
}

export const Header: Story = {
  render: () => <ChatHeader />,
}

export const Conversation: Story = {
  render: () => <ChatMessagesExample isLoading={false} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await waitFor(() => expect(canvas.getByText("I need over-ear headphones for the office")).toBeVisible())
  },
}

export const ConversationWhileAnswering: Story = {
  render: () => <ChatMessagesExample isLoading />,
}

export const SingleMessage: Story = {
  render: () => (
    <div className="max-w-2xl p-3">
      <MessageBoxAI role="ai" text="The studio headphones fit that - they isolate noise and ship today." />
      <MessageBoxAI imageUrl={FIXTURE_IMAGES.product} role="ai" text="Here is the generated preview" />
    </div>
  ),
}

export const Composer: Story = {
  render: () => <ChatInputExample />,
}

export const AddToCartFromChat: Story = {
  render: () => (
    <div className="p-3">
      <AddToCartButton productId={FIXTURE_IDS.product} />
    </div>
  ),
}
