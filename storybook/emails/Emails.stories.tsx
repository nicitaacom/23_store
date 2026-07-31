import { useEffect, useState, type ReactElement } from "react"
import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { renderAsync } from "@react-email/render"
import { expect, waitFor, within } from "storybook/test"

import { cartHeadphonesProduct, headphonesProduct } from "../fixtures"
import { CheckEmail } from "@/emails/CheckEmail"
import { RequestBetterPricesEmail } from "@/emails/RequestBetterPricesEmail"
import { RequestReplanishmentEmail } from "@/emails/RequestReplanishmentEmail"

// The templates render a whole <Html> document, so they go through renderAsync (the same call the
// send paths use) and the resulting markup is shown in an iframe - mounting <Html> inside the story
// div would be invalid nesting and would hide exactly the markup that reaches the mailbox.
function EmailPreview({ template }: { template: ReactElement }) {
  const [html, setHtml] = useState<string | null>(null)

  useEffect(() => {
    let isActive = true
    renderAsync(template, { pretty: true }).then(rendered => {
      if (isActive) setHtml(rendered)
    })
    return () => {
      isActive = false
    }
  }, [template])

  if (!html) return <p className="p-4 text-title">Rendering the email...</p>

  return <iframe className="h-[900px] w-full border-0 bg-white" srcDoc={html} title="Email preview" />
}

const meta = {
  title: "Foundations/Emails",
  parameters: {
    layout: "fullscreen",
    // The preview is an iframe with the mail markup inside, which axe does not reach from the story
    // canvas - the templates set their own inline palette for mail clients anyway.
    a11y: { test: "todo" },
  },
} satisfies Meta

export default meta
type Story = StoryObj<typeof meta>

export const OrderConfirmation: Story = {
  render: () => (
    <EmailPreview
      template={
        <CheckEmail
          allRightsReserved="All rights reserved."
          deliveryDate="February 18"
          feedbackText="Feedback"
          locale="en"
          needHelpText="Need help with your order?"
          orderConfirmed="Your order is confirmed"
          previewText="Your order is confirmed"
          products={[cartHeadphonesProduct]}
          quantityText="Quantity"
          supportText="Support"
          totalText="Total"
          trackYourOrder="Track your order"
          variantLabel="Variant"
          weKeepYouUpdated="We keep you updated at every step."
          willBeDelivered="Your order will be delivered on"
        />
      }
    />
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await waitFor(() => expect(canvas.getByTitle("Email preview")).toBeVisible(), { timeout: 5000 })
  },
}

export const ReplenishmentRequest: Story = {
  render: () => <EmailPreview template={<RequestReplanishmentEmail product={headphonesProduct} />} />,
}

export const BetterPricesRequest: Story = {
  render: () => (
    <EmailPreview
      template={
        <RequestBetterPricesEmail products={[cartHeadphonesProduct]} totalPrice={19900} userEmail="customer@example.com" />
      }
    />
  ),
}
