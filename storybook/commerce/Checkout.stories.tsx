import { useLayoutEffect } from "react"
import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { expect, userEvent, waitFor, within } from "storybook/test"

import { fixtureCart } from "../fixtures"
import useCartStore from "@/store/user/cartStore"
import { useDoYouWantRecieveCheckModal } from "@/store/ui/useDoYouWantRecieveCheckModal"
import { CartModal } from "@/components/ui/Modals/CartModal/CartModal"
import { DoYouWantReceiveCheckModal } from "@/components/ui/Modals/DoYouWantReceiveCheckModal"
import { PayWithKlarnaButton } from "@/components/ui/Modals/CartModal/PaymentButtons/components/PayWithClarnaButton"
import { PayWithMetamaskButton } from "@/components/ui/Modals/CartModal/PaymentButtons/components/PayWithMetamaskButton"
import { PayWithPaypalButton } from "@/components/ui/Modals/CartModal/PaymentButtons/components/PayWithPaypalButton"
import { PayWithStripeButton } from "@/components/ui/Modals/CartModal/PaymentButtons/components/PayWithStripeButton"
import { PaymentButtons } from "@/components/ui/Modals/CartModal/PaymentButtons/PaymentButtons"

function CartModalExample({ isEmpty = false }: { isEmpty?: boolean }) {
  useLayoutEffect(() => {
    useCartStore.setState({ products: isEmpty ? {} : fixtureCart })
  }, [isEmpty])

  return <CartModal />
}

function CheckRequestExample() {
  useLayoutEffect(() => {
    useDoYouWantRecieveCheckModal.getState().openModal("customer@example.com")
  }, [])

  return <DoYouWantReceiveCheckModal />
}

const meta = {
  title: "Commerce/Checkout",
  parameters: {
    layout: "fullscreen",
    nextjs: { navigation: { pathname: "/en", query: { modal: "CartModal" } } },
    // Report mode - the checkout surfaces ship with the dark palette and axe flags the light-theme
    // contrast of subTitle text inside them.
    a11y: { test: "todo" },
  },
} satisfies Meta

export default meta
type Story = StoryObj<typeof meta>

export const Cart: Story = {
  render: () => <CartModalExample />,
}

export const EmptyCartModal: Story = {
  render: () => <CartModalExample isEmpty />,
}

// Regression cover for "the X in the cart modal does nothing": the close has to hide the modal on
// its own, without waiting for the router to report the stripped ?modal= param.
export const CartClosesOnX: Story = {
  render: () => <CartModalExample />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await waitFor(() => expect(canvas.getByRole("heading", { name: "Your Cart" })).toBeVisible())

    const closeButton = canvasElement.querySelector("svg.absolute.right-3")
    await expect(closeButton).not.toBeNull()
    await userEvent.click(closeButton as Element)

    await waitFor(() => expect(canvas.queryByRole("heading", { name: "Your Cart" })).not.toBeInTheDocument(), { timeout: 3000 })
  },
}

export const AllPaymentMethods: Story = {
  render: () => (
    <div className="grid max-w-md gap-2 p-3">
      <PaymentButtons />
    </div>
  ),
}

export const PaymentMethodsOneByOne: Story = {
  render: () => (
    <div className="grid max-w-md gap-2 p-3">
      <PayWithStripeButton />
      <PayWithPaypalButton />
      <PayWithKlarnaButton />
      <PayWithMetamaskButton />
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await waitFor(() => expect(canvas.getAllByRole("button").length).toBeGreaterThanOrEqual(4))
  },
}

export const CheckRequest: Story = {
  render: () => <CheckRequestExample />,
}
