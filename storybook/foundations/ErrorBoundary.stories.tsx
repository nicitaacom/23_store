import { HttpResponse, http } from "msw"
import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { expect, fn, userEvent, waitFor, within } from "storybook/test"

import { storybookServices } from "../mocks/services"
import LocaleError from "@/[locale]/error"

const successfulReportHandlers = [
  http.post("/api/rate-limit", () => HttpResponse.json({ allowed: true, remaining: 4 })),
  http.post("/api/send-email", async ({ request }) => {
    storybookServices.email(await request.json())
    return HttpResponse.json({ status: 200 })
  }),
]

const failedReportHandlers = [
  http.post("/api/rate-limit", () => HttpResponse.json({ message: "Report unavailable" }, { status: 500 })),
]

const meta = {
  title: "Foundations/ErrorBoundary",
  component: LocaleError,
  parameters: {
    layout: "fullscreen",
  },
} satisfies Meta<typeof LocaleError>

export default meta
type Story = StoryObj<typeof meta>

// Regression coverage for the locale segment's error boundary: when the buyer clicks "Report to
// support" it must actually SEND the report through the existing /api/send-email flow - not open a
// mailto: link, which does nothing when the machine has no mail client configured (see
// app/[locale]/error.tsx, app/functions/support/reportErrorToSupport.tsx).
export const RenderCrash: Story = {
  args: {
    error: Object.assign(new Error("Attempted to call useScopedI18n() from the server"), { digest: "story-example-digest" }),
    reset: fn(),
  },
  parameters: { msw: { handlers: successfulReportHandlers } },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement)

    const tryAgainButton = await canvas.findByRole("button", { name: /try again/i })
    await tryAgainButton.click()
    await expect(args.reset).toHaveBeenCalledTimes(1)

    await expect(canvas.getByText(/story-example-digest/)).toBeVisible()
    await expect(canvas.getByText(/Attempted to call useScopedI18n\(\) from the server/)).toBeVisible()

    const reportToSupportButton = await canvas.findByRole("button", { name: /report to support/i })
    await userEvent.click(reportToSupportButton)

    await waitFor(() => expect(canvas.getByRole("button", { name: /report sent/i })).toBeVisible())
    await expect(storybookServices.email).toHaveBeenCalledWith(
      expect.objectContaining({
        html: expect.stringContaining("story-example-digest"),
      }),
    )
  },
}

export const ReportFailsGracefully: Story = {
  args: {
    error: Object.assign(new Error("Attempted to call useScopedI18n() from the server"), { digest: "story-example-digest" }),
    reset: fn(),
  },
  parameters: { msw: { handlers: failedReportHandlers } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    const reportToSupportButton = await canvas.findByRole("button", { name: /report to support/i })
    await userEvent.click(reportToSupportButton)

    await waitFor(() => expect(canvas.getByText(/couldn't send automatically/i)).toBeVisible())
  },
}
