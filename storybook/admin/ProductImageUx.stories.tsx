import { useState } from "react"
import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { expect, userEvent, waitFor, within } from "storybook/test"

import type { TSortableProductImage } from "@/ts/product/TSortableProductImage"
import { reorderProductImages } from "@/components/ui/Modals/AdminPanel/functions/reorderProductImages"
import { useFocusVariantLabelAfterImageAdded } from "@/components/ui/Modals/AdminPanel/hooks/useFocusVariantLabelAfterImageAdded"
import { SortableProductImageStrip } from "@/components/ui/Modals/AdminPanel/components/SortableProductImageStrip"

type TStoryProductImage = TSortableProductImage & { label: string }

const PRODUCT_IMAGES: TStoryProductImage[] = [
  { data_url: "/products/headphones.png", label: "Headphones", sortableId: "headphones" },
  { data_url: "/products/keyboard.png", label: "Keyboard", sortableId: "keyboard" },
  { data_url: "/projects/J.png", label: "Joki", sortableId: "joki" },
]

function SortableImagesWorkbench() {
  const [images, setImages] = useState(PRODUCT_IMAGES)
  const [activeImageIndex, setActiveImageIndex] = useState(1)

  function reorderImages(sourceId: string, targetId: string) {
    const reorderedProductImages = reorderProductImages(images, activeImageIndex, sourceId, targetId)
    setImages(reorderedProductImages.images as TStoryProductImage[])
    setActiveImageIndex(reorderedProductImages.activeImageIndex)
  }

  return (
    <div className="grid max-w-lg gap-3 bg-background p-5 text-title">
      <SortableProductImageStrip
        activeImageIndex={activeImageIndex}
        disabled={false}
        images={images}
        onReorder={reorderImages}
        onSelect={setActiveImageIndex}
      />
      <output aria-label="Image order">{images.map(image => image.label).join(", ")}</output>
      <output aria-label="Active image">{images[activeImageIndex]?.label}</output>
    </div>
  )
}

function FocusAfterImageAddedWorkbench() {
  const [imageCount, setImageCount] = useState(0)
  const variantLabelInputRef = useFocusVariantLabelAfterImageAdded(imageCount)

  return (
    <div className="grid max-w-sm gap-3 bg-background p-5">
      <button type="button" onClick={() => setImageCount(currentCount => currentCount + 1)}>
        Add accepted image
      </button>
      <button type="button">Reject image</button>
      <input aria-label="Variant label" ref={variantLabelInputRef} />
    </div>
  )
}

const meta = {
  title: "Admin/ProductImageUx",
  parameters: { layout: "fullscreen" },
} satisfies Meta

export default meta
type Story = StoryObj<typeof meta>

export const SortableImages: Story = {
  render: () => <SortableImagesWorkbench />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const firstImage = await canvas.findByRole("button", { name: /Product image 1/ })

    firstImage.focus()
    await userEvent.keyboard(" ")
    await userEvent.keyboard("{ArrowRight}")
    await userEvent.keyboard(" ")

    await waitFor(() => expect(canvas.getByLabelText("Image order")).toHaveTextContent("Keyboard, Headphones, Joki"))
    await expect(canvas.getByLabelText("Active image")).toHaveTextContent("Keyboard")
  },
}

export const FocusVariantAfterImage: Story = {
  render: () => <FocusAfterImageAddedWorkbench />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(canvas.getByRole("button", { name: "Add accepted image" }))
    await waitFor(() => expect(canvas.getByRole("textbox", { name: "Variant label" })).toHaveFocus())

    await userEvent.click(canvas.getByRole("button", { name: "Reject image" }))
    await expect(canvas.getByRole("textbox", { name: "Variant label" })).not.toHaveFocus()
  },
}
