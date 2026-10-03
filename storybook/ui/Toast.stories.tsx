import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { expect, fireEvent, waitFor, within } from "storybook/test"

import useToast from "@/store/ui/useToast"
import ToastProvider from "@/providers/ToastProvider"

const meta = {
  title: "UI/Toast",
  component: ToastProvider,
  globals: { theme: "dark" },
} satisfies Meta<typeof ToastProvider>

export default meta
type Story = StoryObj<typeof meta>

export const SwipeRightToDismiss: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    useToast.getState().show("success", "Swipe to dismiss", undefined, null)

    const message = await canvas.findByText("Swipe to dismiss")
    const toast = message.closest<HTMLElement>("[data-click-outside-ignore]")
    if (!toast) throw new Error("Toast is not ready")
    await waitFor(() => expect(toast).toBeVisible())

    fireEvent.mouseDown(toast, { clientX: 100, clientY: 100 })
    fireEvent.mouseMove(document, { clientX: 130, clientY: 100 })
    fireEvent.mouseUp(document, { clientX: 130, clientY: 100 })
    await expect(useToast.getState().isOpen).toBe(true)

    fireEvent.mouseDown(toast, { clientX: 200, clientY: 100 })
    fireEvent.mouseMove(document, { clientX: 100, clientY: 100 })
    fireEvent.mouseUp(document, { clientX: 100, clientY: 100 })
    await expect(useToast.getState().isOpen).toBe(true)

    const startTouch = new Touch({ identifier: 1, target: toast, clientX: 100, clientY: 100 })
    const endTouch = new Touch({ identifier: 1, target: toast, clientX: 180, clientY: 100 })
    fireEvent.touchStart(toast, { touches: [startTouch] })
    fireEvent.touchMove(toast, { touches: [endTouch] })
    fireEvent.touchEnd(toast, { touches: [], changedTouches: [endTouch] })
    await waitFor(() => expect(useToast.getState().isOpen).toBe(false))
    await waitFor(() => expect(canvas.queryByText("Swipe to dismiss")).not.toBeInTheDocument())
  },
}
