import { useState } from "react"
import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { expect, waitFor, within } from "storybook/test"

import { usePasteImages } from "@/hooks/ui/usePasteImages"

// A real PNG, drawn big enough to clear the 512x512 minimum the product form applies to pasted images.
function drawPngFile(name: string) {
  const canvas = document.createElement("canvas")
  canvas.width = 600
  canvas.height = 600
  const context = canvas.getContext("2d")
  if (context) {
    context.fillStyle = "#1ce956"
    context.fillRect(0, 0, 600, 600)
  }

  const base64 = canvas.toDataURL("image/png").split(",")[1]
  const bytes = Uint8Array.from(atob(base64), character => character.charCodeAt(0))
  return new File([bytes], name, { type: "image/png" })
}

function pasteFile(name: string) {
  const clipboardData = new DataTransfer()
  clipboardData.items.add(drawPngFile(name))
  window.dispatchEvent(new ClipboardEvent("paste", { clipboardData, bubbles: true, cancelable: true }))
}

// Mirrors what AddProductForm does: append the pasted files to the images already in the gallery.
function PasteGallery() {
  const [pastedNames, setPastedNames] = useState<string[]>([])

  usePasteImages(files => setPastedNames([...pastedNames, ...files.map(file => file.name)]))

  return (
    <div className="grid gap-2 p-4 text-title">
      <p>Paste a screenshot - every paste adds one more entry, it never replaces the list.</p>
      <p data-cy="pasted-amount">Pasted images: {pastedNames.length}</p>
      <ul className="grid gap-1 text-sm text-subTitle">
        {pastedNames.map(name => (
          <li key={name}>{name}</li>
        ))}
      </ul>
    </div>
  )
}

const meta = {
  title: "UI/Inputs/PasteImages",
  parameters: {
    // Report mode - the harness uses the app's subTitle token, which axe reads as low contrast on
    // the light Storybook background.
    a11y: { test: "todo" },
  },
} satisfies Meta

export default meta
type Story = StoryObj<typeof meta>

// Regression cover: the paste listener is attached once. Running the handler the hook was given on
// the first render means it keeps seeing the empty list captured back then, so every paste wipes the
// gallery instead of growing it.
export const SecondPasteAddsOneMore: Story = {
  render: () => <PasteGallery />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await waitFor(() => expect(canvas.getByText("Pasted images: 0")).toBeVisible())

    pasteFile("first.png")
    await waitFor(() => expect(canvas.getByText("Pasted images: 1")).toBeVisible())

    pasteFile("second.png")
    await waitFor(() => expect(canvas.getByText("Pasted images: 2")).toBeVisible())

    await expect(canvas.getByText("first.png")).toBeVisible()
    await expect(canvas.getByText("second.png")).toBeVisible()
  },
}
