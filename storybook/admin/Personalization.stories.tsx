import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { expect, waitFor, within } from "storybook/test"

import type { TProductDB } from "@/ts/product/TProductDB"
import { headphonesProduct } from "../fixtures"
import { PersonalizationForm } from "@/components/ui/Modals/AdminPanel/components/PersonalizationForm"

const configuredProduct: TProductDB = {
  ...headphonesProduct,
  personalization: {
    isEnabled: true,
    defaultConfig: {
      mockupUrl: headphonesProduct.img_url[0],
      printArea: { widthMm: 900, heightMm: 400, minDpi: 150 },
      mockupRect: { leftPct: 5, topPct: 30, widthPct: 90, heightPct: 60 },
    },
  },
}

const meta = {
  title: "Admin/Personalization",
  parameters: {
    layout: "fullscreen",
    nextjs: { navigation: { pathname: "/en/products/product-headphones-23/manage" } },
    // Report mode - the editor uses the admin panel's dark surface tokens, which axe reads as low
    // contrast on the light Storybook background.
    a11y: { test: "todo" },
  },
} satisfies Meta

export default meta
type Story = StoryObj<typeof meta>

// What the owner sees on a product that has no print area yet: one checkbox, nothing else.
export const NotPersonalizableYet: Story = {
  render: () => <PersonalizationForm product={headphonesProduct} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await waitFor(() => expect(canvas.getByText("Buyers can personalize this product")).toBeVisible())
    await expect(canvas.queryByText("Print width (mm)")).not.toBeInTheDocument()
  },
}

export const PrintAreaEditor: Story = {
  render: () => <PersonalizationForm product={configuredProduct} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await waitFor(() => expect(canvas.getByText("Print width (mm)")).toBeVisible())
    // The mm the owner typed are echoed back as a physical size, so a typo is visible immediately
    await expect(canvas.getByText(/900 × 400 mm/)).toBeVisible()
  },
}
