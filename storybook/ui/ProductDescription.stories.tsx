import { useState } from "react"
import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { expect, waitFor, within } from "storybook/test"

import { validateDescription } from "@/utils/productValidation"

const emojiDescription = "✨ Gift ready 🎁 - ships in a 📦 box"
const rejectedDescription = "Costs $5 and comes with a\ttab"

// The admin form runs `validateDescription` on every product description, so this story is where the
// answer for a given text is visible: green line = the description saves, red line = the form blocks it.
function DescriptionValidation({ description }: { description: string }) {
  const [descriptionValue, setDescriptionValue] = useState(description)
  const validateDescriptionResp = validateDescription(descriptionValue)
  const isValid = validateDescriptionResp === true

  return (
    <div className="grid max-w-xl gap-2 p-4">
      <label className="grid gap-1 text-sm text-title">
        Product description
        <textarea
          className="min-h-24 rounded border border-border-color/60 bg-background p-2 text-title"
          value={descriptionValue}
          onChange={event => setDescriptionValue(event.target.value)}
        />
      </label>
      <p className={isValid ? "text-sm text-success" : "text-sm text-danger"} role="status">
        {isValid ? "Description accepted" : validateDescriptionResp}
      </p>
    </div>
  )
}

const meta = {
  title: "UI/Inputs/ProductDescription",
  parameters: {
    // Report mode - the status line uses the app's success/danger tokens, which axe reads as
    // low contrast on the light Storybook background.
    a11y: { test: "todo" },
  },
} satisfies Meta

export default meta
type Story = StoryObj<typeof meta>

export const EmojisAreAccepted: Story = {
  render: () => <DescriptionValidation description={emojiDescription} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await waitFor(() => expect(canvas.getByRole("status")).toHaveTextContent("Description accepted"))
  },
}

export const EveryEmojiShape: Story = {
  render: () => <DescriptionValidation description="Family 👩‍💻, flag 🇫🇮, heart ❤️, thumb 👍🏽 - all fine" />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await waitFor(() => expect(canvas.getByRole("status")).toHaveTextContent("Description accepted"))
  },
}

export const CharactersStillRejected: Story = {
  render: () => <DescriptionValidation description={rejectedDescription} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await waitFor(() => expect(canvas.getByRole("status")).toHaveTextContent("is not allowed near"))
  },
}
