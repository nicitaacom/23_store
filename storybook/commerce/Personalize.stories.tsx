import { useState } from "react"
import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { expect, waitFor, within } from "storybook/test"

import type { TDesignPlacement, TPersonalizationConfig } from "@/ts/product/TPersonalization"
import { computePrintMetrics, getPrintAspect } from "@/utils/printMetrics"
import { PersonalizePreview } from "@/components/ui/Modals/PersonalizeModal/components/PersonalizePreview"
import { PersonalizeQualityBadge } from "@/components/ui/Modals/PersonalizeModal/components/PersonalizeQualityBadge"

// A 3:2 stand-in for a photographed mockup. Inline so the rendered size is fixed and the aspect
// assertion below measures the overlay math, not whatever a real jpg happens to be.
const mockupUrl =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800"><rect width="1200" height="800" fill="#2b2b2b"/></svg>`,
  )

// A 900x400 mm mousepad whose print area sits in the lower two thirds of the mockup.
// 90% of 1200 over 60% of 800 = 1080x480 = the 2.25 aspect of the real 900x400 mm print area.
const mousepadConfig: TPersonalizationConfig = {
  mockupUrl,
  printArea: { widthMm: 900, heightMm: 400, minDpi: 150 },
  mockupRect: { leftPct: 5, topPct: 30, widthPct: 90, heightPct: 60 },
}

function PreviewExample({ designUrl }: { designUrl: string | null }) {
  const [placement, setPlacement] = useState<TDesignPlacement>({ scale: 1, offsetXPct: 0, offsetYPct: 0 })

  return (
    <div className="max-w-xl p-4">
      <PersonalizePreview config={mousepadConfig} designUrl={designUrl} placement={placement} onPlacementChange={setPlacement} />
    </div>
  )
}

function BadgeExample({ sourceWidthPx, sourceHeightPx }: { sourceWidthPx: number; sourceHeightPx: number }) {
  const metrics = computePrintMetrics({ printArea: mousepadConfig.printArea, sourceWidthPx, sourceHeightPx })

  return (
    <div className="p-4">
      <PersonalizeQualityBadge
        metrics={metrics}
        printArea={mousepadConfig.printArea}
        sourceWidthPx={sourceWidthPx}
        sourceHeightPx={sourceHeightPx}
      />
    </div>
  )
}

const meta = {
  title: "Commerce/Personalize",
  parameters: {
    layout: "fullscreen",
    nextjs: { navigation: { pathname: "/en" } },
    // Report mode - the preview and badge use the app's dark-theme tokens, which axe reads as low
    // contrast on the light Storybook background.
    a11y: { test: "todo" },
  },
} satisfies Meta

export default meta
type Story = StoryObj<typeof meta>

export const EmptyPrintArea: Story = {
  render: () => <PreviewExample designUrl={null} />,
}

export const SharpUpload: Story = {
  render: () => <BadgeExample sourceWidthPx={6000} sourceHeightPx={3000} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await waitFor(() => expect(canvas.getByRole("status")).toHaveTextContent("169 DPI"))
  },
}

export const LowResolutionUpload: Story = {
  render: () => <BadgeExample sourceWidthPx={1200} sourceHeightPx={800} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    // The buyer is told the exact pixel count this print size asks for, not just "too small"
    await waitFor(() => expect(canvas.getByText(/5,?315/)).toBeVisible())
  },
}

// The whole point of the feature: the box on screen has the proportions of the physical print area.
// If someone changes the overlay to a fixed pixel size or drops the % math, this fails.
export const PrintAreaMatchesPhysicalSize: Story = {
  render: () => <PreviewExample designUrl={null} />,
  play: async ({ canvasElement }) => {
    const printArea = await waitFor(() => {
      const element = canvasElement.querySelector("[data-cy='personalize-print-area']")
      if (!element) throw new Error("print area is not on screen")
      return element
    })

    const printAreaBox = printArea.getBoundingClientRect()
    const onScreenAspect = printAreaBox.width / printAreaBox.height
    const physicalAspect = getPrintAspect(mousepadConfig.printArea)

    await expect(Math.abs(onScreenAspect - physicalAspect) / physicalAspect).toBeLessThan(0.02)
  },
}
