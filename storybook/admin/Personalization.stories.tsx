import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { HttpResponse, http } from "msw"
import { expect, userEvent, waitFor, within } from "storybook/test"

import type { TProductDB } from "@/ts/product/TProductDB"
import { fixtureCategories, headphonesProduct } from "../fixtures"
import { EditProductForm } from "@/components/ui/Modals/AdminPanel/components/EditProductForm"
import { PersonalizationForm } from "@/components/ui/Modals/AdminPanel/components/PersonalizationForm"

// The product row asks for the category list while it is on screen - answering it here keeps the
// story from failing on an unhandled request.
const editProductHandlers = [http.get("*/api/categories/select", () => HttpResponse.json({ categories: fixtureCategories }))]

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
  render: () => <PersonalizationForm imageUrls={headphonesProduct.img_url} productId={headphonesProduct.id} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await waitFor(() => expect(canvas.getByText("Buyers can personalize this product")).toBeVisible())
    await expect(canvas.queryByText("Print width (mm)")).not.toBeInTheDocument()
  },
}

export const PrintAreaEditor: Story = {
  render: () => (
    <PersonalizationForm
      imageUrls={configuredProduct.img_url}
      productId={configuredProduct.id}
      personalization={configuredProduct.personalization}
    />
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await waitFor(() => expect(canvas.getByText("Print width (mm)")).toBeVisible())
    // The mm the owner typed are echoed back as a physical size, so a typo is visible immediately
    await expect(canvas.getByText(/900 × 400 mm/)).toBeVisible()
    // A draggable mockup steals the pointer halfway through a rectangle, and Add product's drop zone
    // then takes the drop as a new upload - so the browser is never allowed to drag it
    await expect(canvasElement.querySelector('[data-cy="personalization-mockup-image"]')).toHaveAttribute(
      "draggable",
      "false",
    )
  },
}

// Before the product exists there is no row to update, so the editor reports what was marked out and
// the create pipeline stores it - the update button is replaced by a line saying so.
export const BeforeProductExists: Story = {
  render: () => <PersonalizationForm imageUrls={headphonesProduct.img_url} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(await waitFor(() => canvas.getByText("Buyers can personalize this product")))
    await waitFor(() => expect(canvas.getByText("Print width (mm)")).toBeVisible())
    await expect(canvas.getByText("The print area is stored when you press Create product.")).toBeVisible()
    await expect(canvas.queryByRole("button", { name: /Update personalization/ })).not.toBeInTheDocument()
    // Ticked but no mm typed yet - the reason the product stays uncreatable is on screen
    await expect(canvas.getByText(/avoid refunds and bad reviews/)).toBeVisible()
  },
}

// A rectangle whose shape drifts from the print size blocks the update button: the buyer's preview would
// promise an aspect ratio the physical product does not have.
export const DimensionsBlockTheUpdate: Story = {
  render: () => (
    <PersonalizationForm
      imageUrls={configuredProduct.img_url}
      productId={configuredProduct.id}
      personalization={configuredProduct.personalization}
    />
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const printWidthInput = await waitFor(() => canvas.getByLabelText("Print width (mm)"))

    // No print width is the plainest way to be unusable, whatever the fixture's rectangle looks like
    await userEvent.clear(printWidthInput)
    await waitFor(() => expect(canvas.getByRole("button", { name: "Update personalization" })).toBeDisabled())
    await expect(canvas.getByText(/avoid refunds and bad reviews/)).toBeVisible()

    // Both mm back, then the one click that makes the rectangle the shape of the print size
    await userEvent.type(printWidthInput, "900")
    const fixShapeButton = canvas.queryByRole("button", { name: "Fix the shape" })
    if (fixShapeButton) await userEvent.click(fixShapeButton)

    await waitFor(() => expect(canvas.getByRole("button", { name: "Update personalization" })).toBeEnabled())
    await expect(canvas.queryByText(/avoid refunds and bad reviews/)).not.toBeInTheDocument()
  },
}

// The reason the editor has two mount points: from the admin panel's Edit product list the owner
// reaches the print area without ever opening /products/<id>/manage.
export const InsideAdminPanel: Story = {
  parameters: { msw: { handlers: editProductHandlers } },
  render: () => <EditProductForm ownerProducts={[configuredProduct]} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await waitFor(() => expect(canvas.getByText("Personalization")).toBeVisible())
    await waitFor(() => expect(canvas.getByText("Print width (mm)")).toBeVisible())
    await expect(canvas.getByText(/900 × 400 mm/)).toBeVisible()
  },
}
